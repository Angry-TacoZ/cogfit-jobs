const { createRequire } = require('node:module');
const { createFirestore } = require('../functions/firestoreClient');

const functionsRequire = createRequire(require.resolve('../functions/package.json'));
const { deleteApp, initializeApp } = functionsRequire('firebase-admin/app');
const { FieldValue } = functionsRequire('firebase-admin/firestore');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Run this check through the Firestore emulator.');
}

const app = initializeApp({ projectId: 'cogfit-jobs' }, 'firestore-rest-smoke');
const db = createFirestore(app);
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
