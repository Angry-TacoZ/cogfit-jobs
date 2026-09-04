const { initializeFirestore } = require('firebase-admin/firestore');

const firestoreSettings = Object.freeze({ preferRest: true });

function createFirestore(app, initialize = initializeFirestore) {
  return initialize(app, firestoreSettings);
}

module.exports = {
  createFirestore,
  firestoreSettings
};
