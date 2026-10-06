import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { before, after, test } from 'node:test';

const run = promisify(execFile);
let temp, app, db, server, client, baseUrl, alice, bob;
let dbOutput = '', serverOutput = '';

async function freePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  listener.close();
  await once(listener, 'close');
  return port;
}

async function stop(child) {
  if (child && child.exitCode === null) {
    const exit = once(child, 'exit');
    child.kill();
    await exit;
  }
}

async function api(token, route, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { origin: baseUrl, cookie: `entre_nos_session=${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), 'qa-financas-api-'));
  app = path.join(temp, 'app');
  await mkdir(path.join(temp, 'clean'));
  await run('git', ['clone', '--quiet', '--depth', '1', process.env.QA_APP_SOURCE || 'https://github.com/YannSantana/financas-a-dois.git', app]);
  if (!process.env.npm_execpath) throw new Error('Execute com npm test.');
  await run(process.execPath, [process.env.npm_execpath, 'ci', '--ignore-scripts'], { cwd: app });
  const dbPort = await freePort();
  const url = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`;
  db = spawn(process.execPath, [path.join(app, 'node_modules/@electric-sql/pglite-socket/dist/scripts/server.js'), `--port=${dbPort}`, '--host=127.0.0.1', '--extensions=pgcrypto', '--max-connections=3'], {
    cwd: path.join(temp, 'clean'), stdio: ['ignore', 'pipe', 'pipe']
  });
  db.stdout.on('data', chunk => { dbOutput += chunk; });
  db.stderr.on('data', chunk => { dbOutput += chunk; });
  const { Client } = createRequire(path.join(app, 'package.json'))('pg');
  for (let n = 0; n < 100; n++) {
    if (db.exitCode !== null) throw new Error(`Banco encerrou: ${dbOutput}`);
    try { client = new Client({ connectionString: url }); await client.connect(); break; }
    catch { await client?.end().catch(() => {}); client = null; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!client) throw new Error(`Banco não iniciou: ${dbOutput}`);
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(app, 'server.mjs')], {
    cwd: path.join(temp, 'clean'),
    env: { ...process.env, PORT: String(port), PUBLIC_APP_ORIGIN: baseUrl, DATABASE_URL: url, GOOGLE_CLIENT_ID: '', PG_POOL_MAX: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  let ready = false;
  for (let n = 0; n < 150; n++) {
    if (server.exitCode !== null) throw new Error(`Servidor encerrou: ${serverOutput}`);
    try { if ((await fetch(`${baseUrl}/api/health`)).status === 200) { ready = true; break; } } catch { /* Initializing. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`Servidor não iniciou: ${serverOutput}`);

  const addUser = async (name, suffix) => {
    const token = `qa-${suffix}-token`;
    const { rows } = await client.query('INSERT INTO users(google_subject,email,name) VALUES($1,$2,$3) RETURNING id', [`qa-${suffix}`, `qa-${suffix}@example.test`, name]);
    await client.query('INSERT INTO profiles(user_id) VALUES($1)', [rows[0].id]);
    await client.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'1 day\')', [createHash('sha256').update(token).digest('hex'), rows[0].id]);
    return { id: rows[0].id, token };
  };
  alice = await addUser('Ana QA', 'ana');
  bob = await addUser('Beto QA', 'beto');
  const { rows } = await client.query('INSERT INTO couples(name,created_by) VALUES($1,$2) RETURNING id', ['Casal de teste', alice.id]);
  await client.query('INSERT INTO couple_members(couple_id,user_id,role) VALUES($1,$2,$3),($1,$4,$5)', [rows[0].id, alice.id, 'owner', bob.id, 'member']);
  await client.query('INSERT INTO subscriptions(couple_id,plan) VALUES($1,$2)', [rows[0].id, 'free']);
});

after(async () => {
  await client?.end().catch(() => {});
  await stop(server);
  await stop(db);
  if (temp) await rm(temp, { recursive: true, force: true });
});

test('despesas compartilhadas aparecem para o casal; despesas pessoais ficam privadas', async () => {
  const shared = await api(alice.token, '/api/transactions', 'POST', { description: 'Mercado do mês', amount: 120, direction: 'expense', category: 'Alimentação', visibility: 'shared', date: '2026-10-01' });
  const personal = await api(alice.token, '/api/transactions', 'POST', { description: 'Presente surpresa', amount: 50, direction: 'expense', category: 'Outros', visibility: 'personal', date: '2026-10-02' });
  assert.equal(shared.status, 201, JSON.stringify(shared.data));
  assert.equal(personal.status, 201, JSON.stringify(personal.data));
  const ana = await api(alice.token, '/api/dashboard?month=2026-10');
  const beto = await api(bob.token, '/api/dashboard?month=2026-10');
  assert.equal(ana.status, 200, JSON.stringify(ana.data));
  assert.equal(beto.status, 200, JSON.stringify(beto.data));
  assert.deepEqual(ana.data.transactions.map(tx => tx.description).sort(), ['Mercado do mês', 'Presente surpresa']);
  assert.deepEqual(beto.data.transactions.map(tx => tx.description), ['Mercado do mês']);
  assert.equal(Number(ana.data.totals.shared_expenses), 120);
  assert.equal(Number(ana.data.totals.personal_expenses), 50);
  assert.equal(Number(beto.data.totals.personal_expenses), 0);
  alice.sharedId = shared.data.transaction.id;
});

test('uma pessoa não pode editar o lançamento criado pela outra', async () => {
  const result = await api(bob.token, `/api/transactions/${alice.sharedId}`, 'PUT', { description: 'Valor alterado', amount: 1, direction: 'expense', category: 'Outros', visibility: 'shared', date: '2026-10-01' });
  assert.equal(result.status, 404, JSON.stringify(result.data));
  const dashboard = await api(alice.token, '/api/dashboard?month=2026-10');
  assert.equal(dashboard.data.transactions.find(tx => tx.id === alice.sharedId).description, 'Mercado do mês');
});

test('plano gratuito permite uma meta ativa e bloqueia a segunda', async () => {
  const first = await api(alice.token, '/api/goals', 'POST', { title: 'Viagem', targetAmount: 1000 });
  const second = await api(alice.token, '/api/goals', 'POST', { title: 'Reserva', targetAmount: 500 });
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(second.status, 403, JSON.stringify(second.data));
  assert.equal(second.data.code, 'premium_required');
});
