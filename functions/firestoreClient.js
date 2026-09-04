const { initializeFirestore } = require('firebase-admin/firestore');
const { configureCloudRunMetadataHost } = require('./runtimeIdentity');

const firestoreSettings = Object.freeze({ preferRest: true });

function createFirestore(app, initialize = initializeFirestore, env = process.env) {
  configureCloudRunMetadataHost(env);
  return initialize(app, firestoreSettings);
}

module.exports = {
  createFirestore,
  firestoreSettings
};
