// Match the metadata library's fully qualified fallback hostname exactly.
const CLOUD_RUN_METADATA_HOST = 'metadata.google.internal.';
const METADATA_NO_PROXY_HOSTS = Object.freeze([
  'metadata.google.internal',
  CLOUD_RUN_METADATA_HOST,
  '.google.internal',
  '169.254.169.254'
]);

function metadataNoProxyOverrides(env) {
  return [env.GCE_METADATA_HOST, env.GCE_METADATA_IP]
    .filter((value) => typeof value === 'string' && value.trim())
    .flatMap((value) => {
      const endpoint = value.trim();
      try {
        const url = new URL(/^[a-z]+:\/\//i.test(endpoint) ? endpoint : `http://${endpoint}`);
        return [endpoint, url.hostname];
      } catch {
        return [endpoint];
      }
    });
}

function appendMetadataNoProxy(env) {
  const entries = [
    ...(env.NO_PROXY || '').split(','),
    ...(env.no_proxy || '').split(','),
    ...METADATA_NO_PROXY_HOSTS,
    ...metadataNoProxyOverrides(env)
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  env.NO_PROXY = [...new Set(entries)].join(',');
}

function configureCloudRunMetadataHost(env = process.env) {
  if (!env.K_SERVICE) return;

  if (!env.GCE_METADATA_HOST && !env.GCE_METADATA_IP) {
    env.GCE_METADATA_HOST = CLOUD_RUN_METADATA_HOST;
  }

  // gaxios honors NO_PROXY for metadata calls if the managed runtime provides a proxy.
  appendMetadataNoProxy(env);
}

module.exports = {
  CLOUD_RUN_METADATA_HOST,
  METADATA_NO_PROXY_HOSTS,
  metadataNoProxyOverrides,
  configureCloudRunMetadataHost
};
