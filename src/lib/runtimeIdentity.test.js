import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CLOUD_RUN_METADATA_HOST,
  configureCloudRunMetadataHost
} = require('../../functions/runtimeIdentity.js');

describe('Cloud Run runtime identity configuration', () => {
  it('uses the documented Cloud Run metadata hostname when no metadata override exists', () => {
    const env = { K_SERVICE: 'saveprofile' };

    configureCloudRunMetadataHost(env);

    expect(env.GCE_METADATA_HOST).toBe(CLOUD_RUN_METADATA_HOST);
  });

  it('preserves explicit metadata host and IP overrides', () => {
    const hostOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_HOST: 'metadata.example.test' };
    const ipOverride = { K_SERVICE: 'saveprofile', GCE_METADATA_IP: '192.0.2.10' };

    configureCloudRunMetadataHost(hostOverride);
    configureCloudRunMetadataHost(ipOverride);

    expect(hostOverride.GCE_METADATA_HOST).toBe('metadata.example.test');
    expect(ipOverride.GCE_METADATA_HOST).toBeUndefined();
  });

  it('does not alter local execution environments', () => {
    const env = {};

    configureCloudRunMetadataHost(env);

    expect(env.GCE_METADATA_HOST).toBeUndefined();
  });
});
