import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

let app;
let appPromise;
let appCheckStarted = false;

async function loadFirebaseConfig() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) {
      throw new Error('Firebase Hosting init config is unavailable.');
    }
    return response.json();
  }

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Local Firebase config is missing: ${missing.join(', ')}. Production uses Firebase Hosting init config.`);
  }

  return config;
}

export async function getFirebaseApp() {
  if (!appPromise) {
    appPromise = loadFirebaseConfig().then((config) => {
      app = getApps()[0] || initializeApp(config);
      return app;
    });
  }
  return appPromise;
}

export async function startAppCheck() {
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    throw new Error('Firebase App Check site key is missing.');
  }
  if (!appCheckStarted) {
    initializeAppCheck(await getFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
    appCheckStarted = true;
  }
}

export async function getFirebaseAuth() {
  return getAuth(await getFirebaseApp());
}

export async function getFirebaseDb() {
  return getFirestore(await getFirebaseApp());
}

async function requireCurrentUser(action) {
  const auth = await getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error(`Sign in before ${action}.`);
  }
  return auth.currentUser;
}

export async function watchAuth(callback) {
  return onAuthStateChanged(await getFirebaseAuth(), callback);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(await getFirebaseAuth(), email, password);
}

export async function createAccountWithEmail(email, password) {
  return createUserWithEmailAndPassword(await getFirebaseAuth(), email, password);
}

export async function signOutCurrentUser() {
  return signOut(await getFirebaseAuth());
}

export async function callEvaluateJob(profile, jobAd) {
  await startAppCheck();
  await requireCurrentUser('running live analysis');
  const functions = getFunctions(await getFirebaseApp(), 'us-central1');
  const evaluateJob = httpsCallable(functions, 'evaluateJob', { limitedUseAppCheckTokens: true });
  const response = await evaluateJob({ profile, jobAd });
  return response.data;
}

export async function callGenerateProfile(answers, draftProfile) {
  await startAppCheck();
  await requireCurrentUser('generating the final work-fit profile');
  const functions = getFunctions(await getFirebaseApp(), 'us-central1');
  const generateProfile = httpsCallable(functions, 'generateProfile', { limitedUseAppCheckTokens: true });
  const response = await generateProfile({ answers, draftProfile });
  return response.data;
}

export async function saveCloudProfile(profile, answers = {}) {
  const user = await requireCurrentUser('saving your profile');
  const db = await getFirebaseDb();
  const profileId = profile.profile_id || crypto.randomUUID();
  const profileWithId = { ...profile, profile_id: profileId };
  await setDoc(doc(db, 'users', user.uid, 'profiles', profileId), {
    profile: profileWithId,
    answers,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });
  return profileWithId;
}

export async function saveCloudEvaluation(profile, evaluation, jobAd) {
  const user = await requireCurrentUser('saving the job evaluation');
  const db = await getFirebaseDb();
  const profileId = profile.profile_id || 'default-profile';
  const evaluationId = evaluation.id || crypto.randomUUID();
  const evaluationWithId = { ...evaluation, id: evaluationId, profile_id: profileId };
  await setDoc(doc(db, 'users', user.uid, 'profiles', profileId), {
    profile: { ...profile, profile_id: profileId },
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(db, 'users', user.uid, 'profiles', profileId, 'evaluations', evaluationId), {
    evaluation: evaluationWithId,
    jobAd,
    createdAt: serverTimestamp()
  }, { merge: true });
  return evaluationWithId;
}

export async function saveCloudFeedback(profileId, evaluationId, value) {
  const user = await requireCurrentUser('saving feedback');
  const db = await getFirebaseDb();
  await addDoc(collection(db, 'users', user.uid, 'profiles', profileId, 'feedback'), {
    evaluationId,
    value,
    createdAt: serverTimestamp()
  });
}
