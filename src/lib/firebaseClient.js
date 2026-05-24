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
let appCheckStarted = false;

function getFirebaseConfig() {
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
    throw new Error(`Firebase client config is missing: ${missing.join(', ')}.`);
  }

  return config;
}

export function getFirebaseApp() {
  if (!app) {
    app = getApps()[0] || initializeApp(getFirebaseConfig());
  }
  return app;
}

export function startAppCheck() {
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    throw new Error('Firebase App Check site key is missing.');
  }
  if (!appCheckStarted) {
    initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
    appCheckStarted = true;
  }
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function watchAuth(callback) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function createAccountWithEmail(email, password) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signOutCurrentUser() {
  return signOut(getFirebaseAuth());
}

export async function callEvaluateJob(profile, jobAd) {
  startAppCheck();
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error('Sign in before running live analysis.');
  }
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const evaluateJob = httpsCallable(functions, 'evaluateJob', { limitedUseAppCheckTokens: true });
  const response = await evaluateJob({ profile, jobAd });
  return response.data;
}
