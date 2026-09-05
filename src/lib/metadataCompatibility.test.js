import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Resolve the actual Firestore authentication chain, including nested versions.
const functionsRequire = createRequire(new URL('../../functions/package.json', import.meta.url));
const firestoreRequire = createRequire(functionsRequire.resolve('@google-cloud/firestore'));
const gaxRequire = createRequire(firestoreRequire.resolve('google-gax'));
const { Compute } = gaxRequire('google-auth-library');

afterEach(() => vi.unstubAllEnvs());

async function withMetadataServer(includeFlavor, run) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ path: request.url, flavor: request.headers['metadata-flavor'] });
    if (includeFlavor) response.setHeader('Metadata-Flavor', 'Google');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      access_token: 'local-test-token', expires_in: 3600, token_type: 'Bearer'
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  vi.stubEnv('GCE_METADATA_HOST', `127.0.0.1:${server.address().port}`);
  vi.stubEnv('NO_PROXY', '127.0.0.1');
  try {
    await run(requests);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe('Firestore metadata authentication compatibility', () => {
  it('accepts the Google response header and obtains a runtime access token', async () => {
    await withMetadataServer(true, async (requests) => {
      const client = new Compute();
      const result = await client.getAccessToken();
      expect(result.token).toBe('local-test-token');
      expect(requests).toEqual([{
        path: '/computeMetadata/v1/instance/service-accounts/default/token',
        flavor: 'Google'
      }]);
    });
  });

  it('still rejects a response without the required Google header', async () => {
    await withMetadataServer(false, async () => {
      await expect(new Compute().getAccessToken()).rejects.toThrow('incorrect Metadata-Flavor header');
    });
  });
});
