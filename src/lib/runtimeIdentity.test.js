import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CLOUD_RUN_METADATA_HOST,
  METADATA_NO_PROXY_HOSTS,
  configureCloudRunMetadataHost
} = require('../../functions/runtimeIdentity.js');

describe('Cloud Run runtime identity configuration', () => {
  it('uses the fully qualified Cloud Run metadata hostname when no metadata override exists', () => {
    const env = { K_SERVICE: 'saveprofile' };

    configureCloudRunMetadataHost(env);

    expect(env.GCE_METADATA_HOST).toBe(CLOUD_RUN_METADATA_HOST);
    expect(env.NO_PROXY.split(',')).toEqual(expect.arrayContaining(METADATA_NO_PROXY_HOSTS));
  });

  it('preserves explicit metadata host and IP overrides', () => {
    const hostOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_HOST: 'metadata.example.test' };
    const ipOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_IP: '192.0.2.10' };

    configureCloudRunMetadataHost(hostOverride);
    configureCloudRunMetadataHost(ipOverride);

    expect(hostOverride.GCE_METADATA_HOST).toBe('metadata.example.test');
    expect(ipOverride.GCE_METADATA_HOST).toBeUndefined();
  });

  it('preserves existing proxy exclusions while bypassing proxies for metadata requests', () => {
    const env = {
      K_SERVICE: 'saveprofile',
      NO_PROXY: 'localhost,internal.example',
      no_proxy: '127.0.0.1'
    };

    configureCloudRunMetadataHost(env);

    expect(env.NO_PROXY.split(',')).toEqual(expect.arrayContaining([
      'localhost',
      'internal.example',
      '127.0.0.1',
      ...METADATA_NO_PROXY_HOSTS
    ]));
  });

  it('does not alter local execution environments', () => {
    const env = {};

    configureCloudRunMetadataHost(env);

    expect(env.GCE_METADATA_HOST).toBeUndefined();
    expect(env.NO_PROXY).toBeUndefined();
  });
});
