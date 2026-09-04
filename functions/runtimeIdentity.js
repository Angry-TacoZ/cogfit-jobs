const CLOUD_RUN_METADATA_HOST = 'metadata.google.internal';

function configureCloudRunMetadataHost(env = process.env) {
  if (env.K_SERVICE && !env.GCE_METADATA_HOST && !env.GCE_METADATA_IP) {
    env.GCE_METADATA_HOST = CLOUD_RUN_METADATA_HOST;
  }
}

module.exports = { CLOUD_RUN_METADATA_HOST, configureCloudRunMetadataHost };
