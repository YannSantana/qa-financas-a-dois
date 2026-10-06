import { test, expect } from '@playwright/test';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
let temp, server, baseUrl, output = '';

async function freePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  listener.close();
  await once(listener, 'close');
  return port;
}

test.beforeAll(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), 'qa-financas-browser-'));
  const app = path.join(temp, 'app');
  const clean = path.join(temp, 'clean');
  await mkdir(clean);
  await run('git', ['clone', '--quiet', '--depth', '1', process.env.QA_APP_SOURCE || 'https://github.com/YannSantana/financas-a-dois.git', app]);
  if (!process.env.npm_execpath) throw new Error('Execute com npm run test:browser.');
  await run(process.execPath, [process.env.npm_execpath, 'ci', '--ignore-scripts'], { cwd: app });
  baseUrl = `http://127.0.0.1:${await freePort()}`;
  server = spawn(process.execPath, [path.join(app, 'server.mjs')], {
    cwd: clean,
    env: { ...process.env, PORT: baseUrl.split(':').at(-1), PUBLIC_APP_ORIGIN: baseUrl, DATABASE_URL: '', GOOGLE_CLIENT_ID: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  for (let n = 0; n < 50; n++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${baseUrl}/api/health`)).status === 503) return; } catch { /* Initializing. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou: ${output}`);
});

test.afterAll(async () => {
  if (server && server.exitCode === null) { const exit = once(server, 'exit'); server.kill(); await exit; }
  if (temp) await rm(temp, { recursive: true, force: true });
});

async function openDemo(page) {
  await page.goto(baseUrl);
  await page.locator('.m-hero [data-auth-open]').click();
  await expect(page.locator('#authDialog')).toBeVisible();
  await page.locator('#enterDemo').click();
  await expect(page.locator('.app')).toHaveClass(/is-open/);
}

test('a demonstração abre e identifica os dados como fictícios', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator('.m-hero h1')).toContainText('Planos a dois');
  await page.locator('.m-hero [data-auth-open]').click();
  await expect(page.locator('#authDialog')).toContainText('A demonstração usa dados fictícios');
  await page.locator('#enterDemo').click();
  await expect(page.locator('#transactionList .transaction')).toHaveCount(4);
});

test('filtros e busca da demonstração mostram somente as linhas esperadas', async ({ page }) => {
  await openDemo(page);
  const visible = page.locator('#transactionList .transaction:visible');
  await page.locator('[data-filter="personal"]').click();
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText('Spotify Premium');
  await page.locator('[data-filter="shared"]').click();
  await expect(visible).toHaveCount(3);
  await page.locator('#searchTx').fill('uber');
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText('Uber');
});

test('no celular, o menu abre e fecha ao escolher uma seção', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  await page.locator('#menuToggle').click();
  await expect(page.locator('#marketingNav')).toHaveClass(/open/);
  await page.locator('#marketingNav a[href="#recursos"]').click();
  await expect(page.locator('#marketingNav')).not.toHaveClass(/open/);
  await expect(page).toHaveURL(/#recursos$/);
});

test('sem conta, salvar lançamento pede login', async ({ page }) => {
  await openDemo(page);
  await page.locator('.transaction-card [data-modal="transaction"]').click();
  await page.locator('#txDescription').fill('Mercado do mês');
  await page.locator('#txAmount').fill('48.90');
  await page.locator('#modalSubmit').click();
  await expect(page.locator('#authDialog')).toBeVisible();
  await expect(page.locator('#transactionList .transaction')).toHaveCount(4);
});
