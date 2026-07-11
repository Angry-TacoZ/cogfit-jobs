<script>
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import {
    createAccountWithEmail,
    signInWithEmail,
    signOutCurrentUser,
    watchAuth
  } from '../lib/firebaseClient';

  export let compact = false;

  let user = null;
  let mode = 'sign-in';
  let email = '';
  let password = '';
  let error = '';
  let busy = false;

  function friendlyAuthError(authError) {
    const message = authError?.message || 'Authentication failed.';
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

  onMount(() => {
    let unsubscribe;
    let mounted = true;
    try {
      watchAuth((nextUser) => {
        if (mounted) user = nextUser;
      })
        .then((nextUnsubscribe) => {
          unsubscribe = nextUnsubscribe;
        })
        .catch((authError) => {
          if (mounted) error = friendlyAuthError(authError);
        });
    } catch (authError) {
      error = friendlyAuthError(authError);
    }

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  });

  async function submit(event) {
    event.preventDefault();
    error = '';
    busy = true;
    try {
      if (mode === 'create') {
        await createAccountWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (authError) {
      error = friendlyAuthError(authError);
    } finally {
      busy = false;
    }
  }
</script>

{#if user}
  <div class={compact ? 'auth-strip compact-auth' : 'auth-strip'}>
    <span>Signed in as {user.email}</span>
    <Button variant="secondary" on:click={() => signOutCurrentUser()}>Sign out</Button>
  </div>
{:else}
  <section class={compact ? 'auth-panel compact-auth' : 'auth-panel'}>
    <div>
      <h2>Sign in to save your profile</h2>
      <p>Your profile, job evaluations, and feedback are kept under your account so you can reuse them across job ads.</p>
      {#if mode === 'create'}
        <p class="privacy-note">
          By creating an account, you agree that CogFit Jobs will secure your profile, job evaluations, and feedback under your account and use that data to improve the product. Read the <a href="#/data">Data Notice</a>.
        </p>
      {/if}
    </div>
    <form on:submit={submit} class="auth-form">
      <label class="field">
        <span>Email</span>
        <input type="email" bind:value={email} required />
      </label>
      <label class="field">
        <span>Password</span>
        <input type="password" bind:value={password} minlength="6" required />
      </label>
      {#if error}<div class="error">{error}</div>{/if}
      <div class="split-actions">
        <Button type="submit" disabled={busy}>{busy ? 'Working...' : mode === 'create' ? 'Create account' : 'Sign in'}</Button>
        <Button type="button" variant="secondary" on:click={() => mode = mode === 'create' ? 'sign-in' : 'create'}>
          {mode === 'create' ? 'Use existing account' : 'Create account'}
        </Button>
      </div>
    </form>
  </section>
{/if}
