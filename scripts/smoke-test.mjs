import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const port = process.env.SMOKE_PORT || String(43_000 + Math.floor(Math.random() * 1_000));
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = [];
const viteEntryPoint = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url)
);

const commandArgs = [
  viteEntryPoint,
  'preview',
  '--host',
  '127.0.0.1',
  '--port',
  port,
  '--strictPort'
];

let serverExited = false;
const server = spawn(process.execPath, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.on('exit', () => {
  serverExited = true;
});

async function stopServer() {
  if (!server.pid || serverExited) return;

  if (process.platform === 'win32') {
    const taskkill = spawn(
      'taskkill',
      ['/pid', String(server.pid), '/t', '/f'],
      { stdio: 'ignore' }
    );
    await once(taskkill, 'exit');
    return;
  }

  server.kill('SIGTERM');
  const exited = await Promise.race([
    once(server, 'exit').then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000))
  ]);

  if (!exited && !serverExited) {
    server.kill('SIGKILL');
    await once(server, 'exit');
  }
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

    await page.evaluate(() => {
      localStorage.setItem('cogfit.generatedProfile', JSON.stringify({
        target_role_families: ['AI enablement'],
        strongest_evidence: ['Workflow automation'],
        tools_and_skills: ['SQL'],
        energizers: ['Building systems'],
        drainers: ['Repetitive queues'],
        preferred_problem_structure: 'Ambiguous problems with ownership.',
        communication_preferences: ['Writing'],
        interaction_limits: 'Low live-call load.',
        autonomy_needs: 'Independent ownership.',
        negative_fit_patterns: ['Quota pressure'],
        hidden_costs: ['Context switching'],
        misunderstood_resume_signals: ['Nontraditional titles'],
        systems_thinking_score: {
          root_cause_depth: 4,
          system_mapping: 4,
          pattern_recognition: 4,
          failure_mode_awareness: 4,
          improvement_drive: 4,
          abstraction_ability: 4
        },
        confidence_score: 80,
        missing_information: []
      }));
      localStorage.setItem('cogfit.resumeEvidence', JSON.stringify({
        sourceType: 'resume',
        characterCount: 900,
        confidence: 80,
        tools: ['SQL'],
        evidence: ['automation'],
        domains: [],
        titles: [],
        projects: ['Built a workflow automation.'],
        systemsEvidence: []
      }));
    });
    await page.goto(`${baseUrl}/#/profile`, { waitUntil: 'networkidle' });
    await assertVisibleText(page, 'h1', 'Your work-fit profile');
    await page.getByRole('button', { name: /Replace resume evidence/i }).click();
    await assertVisibleText(page, 'h1', 'Create your profile from a resume');

    if (browserErrors.length > 0) {
      throw new Error(`Browser errors detected:\n${browserErrors.join('\n')}`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await runSmokeTest();
    console.log('Smoke test passed');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
