<script>
  import { ArrowRight } from '@lucide/svelte';
  import Button from '../components/Button.svelte';
  import CogMotionMark from '../components/CogMotionMark.svelte';
  import { sampleJobs } from '../data/sampleJobs';
  import { sampleProfile } from '../data/sampleProfiles';
  import { saveGeneratedProfile } from '../lib/storage';

  export let go;

  function runSample() {
    saveGeneratedProfile(sampleProfile);
    sessionStorage.setItem('cogfit.pendingJob', JSON.stringify(sampleJobs[0]));
    sessionStorage.setItem('cogfit.pendingSampleId', sampleJobs[0].id);
    go('evaluator');
  }
</script>

<div class="home-grid">
  <section class="hero">
    <div>
      <h1>CogFit Jobs</h1>
      <p class="subhead">
        CogFit Jobs compares a job ad against how you actually work, what drains you, what you have built, and what evidence you can show.
      </p>
      <div class="hero-actions">
        <Button on:click={() => go('profile')}>Build my work-fit profile <ArrowRight size={18} /></Button>
        <Button variant="secondary" on:click={runSample}>Try sample job ad</Button>
      </div>
    </div>
    <div class="hero-motion-mark">
      <CogMotionMark className="home-motion-mark" />
    </div>
  </section>
  <section class="band">
    <h2>Built for candidates whose evidence is real but unevenly named.</h2>
    <div class="feature-grid">
      <article>
        <h3>Profile first</h3>
        <p>Start with 24 focused questions about work patterns, evidence, constraints, and bad-fit history.</p>
      </article>
      <article>
        <h3>Realistic scoring</h3>
        <p>Role fit, callback likelihood, cognitive fit, and culture risk are scored separately.</p>
      </article>
      <article>
        <h3>Reusable profile</h3>
        <p>Save your work-fit profile to your account and run another job ad without rebuilding everything.</p>
      </article>
    </div>
  </section>
</div>
