<script>
  import { onMount } from 'svelte';
  import { BriefcaseBusiness, ClipboardCheck, Home, Info, UserRound } from '@lucide/svelte';
  import HomePage from './pages/HomePage.svelte';
  import ProfileIntake from './pages/ProfileIntake.svelte';
  import JobEvaluator from './pages/JobEvaluator.svelte';
  import ResultsPage from './pages/ResultsPage.svelte';
  import Methodology from './pages/Methodology.svelte';
  import DataNotice from './pages/DataNotice.svelte';
  import AdminDashboard from './pages/AdminDashboard.svelte';
  import { loadGeneratedProfile } from './lib/storage';
  import cogfitMark from './assets/cogfit-jobs-mark.png';

  const routes = {
    home: HomePage,
    profile: ProfileIntake,
    evaluator: JobEvaluator,
    results: ResultsPage,
    methodology: Methodology,
    data: DataNotice,
    admin: AdminDashboard
  };

  const nav = [
    ['home', 'Home', Home],
    ['profile', 'Profile', UserRound],
    ['evaluator', 'Evaluator', BriefcaseBusiness],
    ['results', 'Results', ClipboardCheck],
    ['methodology', 'Methodology', Info]
  ];

  function getRoute() {
    return window.location.hash.replace('#/', '') || 'home';
  }

  let route = getRoute();
  let profile = loadGeneratedProfile();

  $: Page = routes[route] || HomePage;

  function refreshRoute() {
    route = getRoute();
    profile = loadGeneratedProfile();
  }

  function go(next) {
    window.location.hash = `/${next}`;
    route = next;
    profile = loadGeneratedProfile();
  }

  onMount(() => {
    window.addEventListener('hashchange', refreshRoute);
    return () => window.removeEventListener('hashchange', refreshRoute);
  });
</script>

<div class="app-shell">
  <header class="topbar">
    <button class="brand" on:click={() => go('home')} aria-label="Go to home">
      <span class="brand-mark">
        <img src={cogfitMark} alt="" aria-hidden="true" />
      </span>
      <span>
        <strong>CogFit Jobs</strong>
        <small>Work-fit evaluator</small>
      </span>
    </button>
    <nav class="nav">
      {#each nav as [id, label, Icon]}
        <button class:active={route === id} on:click={() => go(id)}>
          <svelte:component this={Icon} size={17} />
          <span>{label}</span>
        </button>
      {/each}
    </nav>
  </header>
  <main>
    <svelte:component this={Page} {go} {profile} />
  </main>
  <footer class="site-footer">
    <strong>James Lane</strong>
    <span>Created 2026</span>
    <button type="button" on:click={() => go('data')}>Data Notice</button>
  </footer>
</div>
