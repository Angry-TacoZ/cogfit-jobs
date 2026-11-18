const { createRequire } = require('node:module');
const { createFirestore } = require('../functions/firestoreClient');

const functionsRequire = createRequire(require.resolve('../functions/package.json'));
const { deleteApp, initializeApp } = functionsRequire('firebase-admin/app');
const { FieldValue } = functionsRequire('firebase-admin/firestore');
const { OAuth2Client } = functionsRequire('google-auth-library');

if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
  throw new Error('Run this check against a loopback Firestore emulator.');
}

// The REST transport authenticates each request. Use the emulator's local admin identity.
const authClient = new OAuth2Client();
authClient.setCredentials({ access_token: 'owner' });
const app = initializeApp({ projectId: 'cogfit-jobs' }, 'firestore-rest-smoke');
const db = createFirestore(app);
db.settings({ authClient });
const profileRef = db.doc('users/firestore-rest-smoke/profiles/firestore-rest-smoke');

async function run() {
  try {
    await profileRef.set({
      profile: {
        profile_id: 'firestore-rest-smoke',
        confidence_score: 76,
        strongest_evidence: ['Built a deployed internal tool.']
      },
      answers: { q1: 'Build useful systems.' },
      resumeEvidence: {
        sourceType: 'resume',
        characterCount: 640,
        confidence: 76,
        tools: ['JavaScript'],
        evidence: ['deployed apps'],
        domains: ['workflow automation'],
        titles: ['Systems Builder'],
        projects: ['Built a deployed internal tool.'],
        systemsEvidence: ['Improved a workflow.']
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    const saved = await profileRef.get();
    if (!saved.exists || saved.data()?.profile?.profile_id !== 'firestore-rest-smoke') {
      throw new Error('Firestore REST smoke write did not persist the expected profile.');
    }

    await profileRef.delete();
    console.log('Firestore REST smoke test passed');
  } finally {
    await deleteApp(app);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
