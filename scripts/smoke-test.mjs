import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = process.env.SMOKE_PORT || String(43_000 + Math.floor(Math.random() * 1_000));
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = [];

const command = process.platform === 'win32' ? 'cmd.exe' : npmCommand;
const commandArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', npmCommand, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', port, '--strictPort']
  : ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port, '--strictPort'];

let serverExited = false;
const server = spawn(command, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.on('exit', () => {
  serverExited = true;
});

function stopServer() {
  if (!server.pid || serverExited) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  server.kill();
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(`Preview server exited before it was ready\n${serverOutput.join('')}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Preview server did not start on ${baseUrl}\n${serverOutput.join('')}`);
}

async function assertVisibleText(page, selector, expected) {
  const actual = await page.locator(selector).first().textContent();
  if (!actual || !actual.includes(expected)) {
    throw new Error(`Expected ${selector} to include "${expected}", got "${actual || ''}"`);
  }
}

async function runSmokeTest() {
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const browserErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/#/home`, { waitUntil: 'networkidle' });
    await assertVisibleText(page, 'h1', 'CogFit Jobs');

    await page.getByRole('button', { name: /Try sample job ad/i }).click();
    await page.waitForURL(/#\/evaluator/, { timeout: 5_000 });
    await assertVisibleText(page, 'h1', 'Evaluate a job ad');

    await page.getByRole('button', { name: /Generate scored report/i }).click();
    await page.waitForURL(/#\/results/, { timeout: 5_000 });
    await assertVisibleText(page, 'h1', 'AI Enablement / Forward Deployed AI Engineer');

    const scoreCards = await page.locator('.score-card').count();
    if (scoreCards !== 6) {
      throw new Error(`Expected 6 score cards on sample results, found ${scoreCards}`);
    }

    await page.goto(`${baseUrl}/#/methodology`, { waitUntil: 'networkidle' });
    await assertVisibleText(page, 'h1', 'Methodology');

    if (browserErrors.length > 0) {
      throw new Error(`Browser errors detected:\n${browserErrors.join('\n')}`);
    }
  } finally {
    await browser.close();
  }
}

runSmokeTest()
  .then(() => {
    console.log('Smoke test passed');
  })
  .finally(() => {
    stopServer();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
