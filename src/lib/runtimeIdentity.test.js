import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CLOUD_RUN_METADATA_HOST,
  METADATA_NO_PROXY_HOSTS,
  metadataNoProxyOverrides,
  configureCloudRunMetadataHost
} = require('../../functions/runtimeIdentity.js');

describe('Cloud Run runtime identity configuration', () => {
  it('uses the fully qualified Cloud Run metadata hostname when no metadata override exists', () => {
    const env = { K_SERVICE: 'saveprofile' };

    configureCloudRunMetadataHost(env);

    expect(env.GCE_METADATA_HOST).toBe(CLOUD_RUN_METADATA_HOST);
    expect(env.NO_PROXY.split(',')).toEqual(expect.arrayContaining(METADATA_NO_PROXY_HOSTS));
  });

  it('preserves explicit metadata host and IP overrides and bypasses proxies for them', () => {
    const hostOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_HOST: 'custom-metadata.internal:8080' };
    const ipOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_IP: '192.0.2.10' };

    configureCloudRunMetadataHost(hostOverride);
    configureCloudRunMetadataHost(ipOverride);

    expect(hostOverride.GCE_METADATA_HOST).toBe('custom-metadata.internal:8080');
    expect(ipOverride.GCE_METADATA_HOST).toBeUndefined();
    expect(hostOverride.NO_PROXY.split(',')).toEqual(expect.arrayContaining([
      'custom-metadata.internal:8080',
      'custom-metadata.internal'
    ]));
    expect(ipOverride.NO_PROXY.split(',')).toContain('192.0.2.10');
  });

  it('normalizes URL-form metadata overrides for Gaxios hostname matching', () => {
    expect(metadataNoProxyOverrides({ GCE_METADATA_HOST: 'http://metadata.example.test:8080' }))
      .toEqual(['http://metadata.example.test:8080', 'metadata.example.test']);
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
