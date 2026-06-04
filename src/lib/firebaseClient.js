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

async function requireCurrentUser(action) {
  const auth = await getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error(`Sign in before ${action}.`);
  }
  return auth.currentUser;
}

function protectedApiError(error) {
  const message = error?.message || '';
  if (message.includes('appCheck') || message.includes('AppCheck') || message.includes('403')) {
    return new Error('The protected live evaluator rejected this request. Try again from a normal browser window. If it still fails, contact James so the App Check domain settings can be verified.');
  }
  return error;
}

async function runProtectedCall(callback) {
  try {
    return await callback();
  } catch (error) {
    throw protectedApiError(error);
  }
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
  return runProtectedCall(async () => {
    await startAppCheck();
    await requireCurrentUser('running live analysis');
    const functions = getFunctions(await getFirebaseApp(), 'us-central1');
    const evaluateJob = httpsCallable(functions, 'evaluateJob', { limitedUseAppCheckTokens: true });
    const response = await evaluateJob({ profile, jobAd });
    return response.data;
  });
}

export async function callGenerateProfile(answers, draftProfile) {
  return runProtectedCall(async () => {
    await startAppCheck();
    await requireCurrentUser('generating the final work-fit profile');
    const functions = getFunctions(await getFirebaseApp(), 'us-central1');
    const generateProfile = httpsCallable(functions, 'generateProfile', { limitedUseAppCheckTokens: true });
    const response = await generateProfile({ answers, draftProfile });
    return response.data;
  });
}

export async function saveCloudProfile(profile, answers = {}) {
  return runProtectedCall(async () => {
    await startAppCheck();
    await requireCurrentUser('saving your profile');
    const functions = getFunctions(await getFirebaseApp(), 'us-central1');
    const saveProfile = httpsCallable(functions, 'saveProfile', { limitedUseAppCheckTokens: true });
    const response = await saveProfile({ profile, answers });
    return response.data;
  });
}

export async function saveCloudEvaluation(profile, evaluation, jobAd) {
  return runProtectedCall(async () => {
    await startAppCheck();
    await requireCurrentUser('saving the job evaluation');
    const functions = getFunctions(await getFirebaseApp(), 'us-central1');
    const saveEvaluation = httpsCallable(functions, 'saveEvaluation', { limitedUseAppCheckTokens: true });
    const response = await saveEvaluation({ profile, evaluation, jobAd });
    return response.data;
  });
}

export async function saveCloudFeedback(profileId, evaluationId, value) {
  return runProtectedCall(async () => {
    await startAppCheck();
    await requireCurrentUser('saving feedback');
    const functions = getFunctions(await getFirebaseApp(), 'us-central1');
    const saveFeedback = httpsCallable(functions, 'saveFeedback', { limitedUseAppCheckTokens: true });
    await saveFeedback({ profileId, evaluationId, value });
  });
}
