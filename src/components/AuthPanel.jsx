import { useEffect, useState } from 'react';
import Button from './Button';
import {
  createAccountWithEmail,
  signInWithEmail,
  signOutCurrentUser,
  watchAuth
} from '../lib/firebaseClient';

function friendlyAuthError(error) {
  const message = error?.message || 'Authentication failed.';
  if (message.includes('auth/configuration-not-found')) {
    return 'Firebase Auth is not configured yet. Enable Email/Password sign-in in Firebase Authentication.';
  }
  if (message.includes('auth/invalid-credential')) {
    return 'The email or password did not match an account.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'That email already has an account. Sign in instead.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Use a password with at least 6 characters.';
  }
  return message;
}

export default function AuthPanel({ compact = false }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsubscribe;
    let mounted = true;
    try {
      watchAuth((nextUser) => {
        if (mounted) setUser(nextUser);
      })
        .then((nextUnsubscribe) => {
          unsubscribe = nextUnsubscribe;
        })
        .catch((authError) => {
          if (mounted) setError(friendlyAuthError(authError));
        });
    } catch (authError) {
      setError(friendlyAuthError(authError));
    }
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'create') {
        await createAccountWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className={compact ? 'auth-strip compact-auth' : 'auth-strip'}>
        <span>Signed in as {user.email}</span>
        <Button variant="secondary" onClick={() => signOutCurrentUser()}>Sign out</Button>
      </div>
    );
  }

  return (
    <section className={compact ? 'auth-panel compact-auth' : 'auth-panel'}>
      <div>
        <h2>Sign in to use live Gemini scoring</h2>
        <p>Profile generation and job evaluation send your inputs to protected server functions. The browser never sees the model API key.</p>
        {mode === 'create' && (
          <p className="privacy-note">
            By creating an account, you agree that CogFit Jobs will secure your profile, job evaluations, and feedback under your account and use that data to improve the product.
          </p>
        )}
      </div>
      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="split-actions">
          <Button type="submit" disabled={busy}>{busy ? 'Working...' : mode === 'create' ? 'Create account' : 'Sign in'}</Button>
          <Button type="button" variant="secondary" onClick={() => setMode(mode === 'create' ? 'sign-in' : 'create')}>
            {mode === 'create' ? 'Use existing account' : 'Create account'}
          </Button>
        </div>
      </form>
    </section>
  );
}
