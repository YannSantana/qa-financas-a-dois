import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const run = promisify(execFile);
const appRepository = 'https://github.com/YannSantana/financas-a-dois.git';
let server;
let temporaryDirectory;
let projectRoot;
let emptyWorkingDirectory;
let baseUrl;
let output = '';

async function availablePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  listener.close();
  await once(listener, 'close');
  return port;
}

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'qa-financas-a-dois-'));
  projectRoot = path.join(temporaryDirectory, 'app');
  emptyWorkingDirectory = path.join(temporaryDirectory, 'sem-configuracao');
  await mkdir(emptyWorkingDirectory);
  await run('git', ['clone', '--quiet', '--depth', '1', appRepository, projectRoot]);
  if (!process.env.npm_execpath) throw new Error('Execute esta suíte com npm test.');
  await run(process.execPath, [process.env.npm_execpath, 'ci', '--ignore-scripts'], { cwd: projectRoot });

  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  // A clean working directory keeps any local .env out of this demo-mode test.
  server = spawn(process.execPath, [path.join(projectRoot, 'server.mjs')], {
    cwd: emptyWorkingDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      PUBLIC_APP_ORIGIN: baseUrl,
      DATABASE_URL: '',
      GOOGLE_CLIENT_ID: '',
      WHATSAPP_VERIFY_TOKEN: '',
      WHATSAPP_APP_SECRET: '',
      WHATSAPP_ACCESS_TOKEN: '',
      WHATSAPP_PHONE_NUMBER_ID: '',
      WHATSAPP_BUSINESS_NUMBER: '',
      WHATSAPP_GRAPH_API_VERSION: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });

  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Servidor encerrou antes dos testes:\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 503) return;
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou a tempo:\n${output}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('apresentação e imagem de demonstração estão disponíveis', async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /Entre Nós — finanças em sintonia/);

  const image = await fetch(`${baseUrl}/assets/couple-money.svg`);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await image.text(), /<svg\b/);
});

test('modo demonstração informa que integrações e banco estão desativados', async () => {
  const config = await fetch(`${baseUrl}/api/config`);
  assert.equal(config.status, 200);
  assert.deepEqual(await config.json(), {
    googleClientId: '',
    whatsappBusinessNumber: '',
    databaseConfigured: false,
    googleConfigured: false,
    whatsappConfigured: false,
    paymentsConfigured: false,
    openFinanceConfigured: false
  });

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false, database: 'not_configured' });
});

test('sem banco, dados pessoais não são disponibilizados', async () => {
  const response = await fetch(`${baseUrl}/api/session`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'database_unavailable');
});

test('sem banco, lançamentos e metas não podem ser gravados', async () => {
  for (const pathname of ['/api/transactions', '/api/goals', '/api/budgets']) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: 'POST',
      headers: { origin: baseUrl, 'content-type': 'application/json' },
      body: '{}'
    });
    assert.equal(response.status, 503, pathname);
    assert.equal((await response.json()).code, 'database_unavailable');
  }
});

test('login Google não promete acesso quando a integração está desligada', async () => {
  const response = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { origin: baseUrl, 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'google_not_configured');
});

test('arquivos internos não podem ser baixados pela apresentação pública', async () => {
  for (const pathname of ['/server.mjs', '/schema.sql', '/.env', '/package.json']) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  }
});

test('logout rejeita origem externa antes de alterar a sessão', async () => {
  const rejected = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: 'https://site-externo.example' }
  });
  assert.equal(rejected.status, 403);
  assert.match((await rejected.json()).error, /Origem não autorizada/);

  const allowed = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: baseUrl }
  });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).ok, true);
  assert.match(allowed.headers.get('set-cookie'), /Max-Age=0/);
});

test('webhook não aceita verificação sem o token configurado', async () => {
  const response = await fetch(`${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=qualquer&hub.challenge=123`);
  assert.equal(response.status, 403);
  assert.equal(await response.text(), 'Forbidden');
});
