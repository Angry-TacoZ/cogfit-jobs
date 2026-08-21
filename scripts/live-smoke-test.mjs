const siteUrl = new URL(process.env.LIVE_SITE_URL || 'https://cogfit-jobs.web.app');
const projectId = process.env.FIREBASE_PROJECT_ID || 'cogfit-jobs';
const region = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';
const timeoutMs = 15_000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requireStatus(url, expectedStatus, options) {
  const response = await fetchWithTimeout(url, options);
  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${url} to return ${expectedStatus}, got ${response.status}`);
  }
  return response;
}

async function runLiveSmokeTest() {
  const homeResponse = await requireStatus(siteUrl, 200);
  const homeHtml = await homeResponse.text();

  if (!homeHtml.includes('<title>CogFit Jobs</title>')) {
    throw new Error('Live home page did not contain the expected CogFit Jobs title.');
  }

  await requireStatus(new URL('/profile', siteUrl), 200);

  const scriptMatch = homeHtml.match(/<script[^>]+src="([^"]+\.js)"/i);
  if (!scriptMatch) {
    throw new Error('Live home page did not reference a production JavaScript asset.');
  }
  await requireStatus(new URL(scriptMatch[1], siteUrl), 200);

  const functionUrl = new URL(
    `https://${region}-${projectId}.cloudfunctions.net/generateProfile`
  );
  const unauthorizedResponse = await requireStatus(functionUrl, 401, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: {} })
  });
  const unauthorizedBody = await unauthorizedResponse.text();

  if (!unauthorizedBody.includes('UNAUTHENTICATED')) {
    throw new Error('Protected generateProfile function did not return an authentication error.');
  }
}

runLiveSmokeTest()
  .then(() => console.log(`Live smoke test passed for ${siteUrl.origin}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
