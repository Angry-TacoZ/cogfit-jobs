<script>
  import Button from '../components/Button.svelte';
  import AuthPanel from '../components/AuthPanel.svelte';
  import { sampleJobs } from '../data/sampleJobs';
  import { sampleEvaluations } from '../data/sampleEvaluations';
  import { llmAdapter } from '../lib/llmAdapter';
  import { loadGeneratedProfile, saveEvaluation } from '../lib/storage';
  import { saveCloudEvaluation } from '../lib/firebaseClient';

  export let go;

  const emptyJob = { title: '', company: '', description: '', notes: '' };

  function combinedJobText(nextJob) {
    return [
      nextJob.title,
      nextJob.company,
      nextJob.description,
      nextJob.notes && `Interest notes: ${nextJob.notes}`
    ].filter(Boolean).join('\n\n');
  }

  function inferJobMeta(text) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const title = lines[0]?.slice(0, 160) || 'Pasted job ad';
    const companyLine = lines.find((line) => /^company\s*:/i.test(line) || /^at\s+/i.test(line));
    const company = companyLine
      ? companyLine.replace(/^company\s*:/i, '').replace(/^at\s+/i, '').trim().slice(0, 160)
      : 'Unknown company';
    return { title, company };
  }

  function initialJob() {
    const pending = sessionStorage.getItem('cogfit.pendingJob');
    if (!pending) return emptyJob;
    sessionStorage.removeItem('cogfit.pendingJob');
    try {
      const sample = JSON.parse(pending);
      return {
        title: sample.title || '',
        company: sample.company || '',
        description: sample.description || '',
        notes: sample.notes || ''
      };
    } catch {
      return emptyJob;
    }
  }

  function initialSampleId() {
    const pending = sessionStorage.getItem('cogfit.pendingSampleId');
    if (!pending) return '';
    sessionStorage.removeItem('cogfit.pendingSampleId');
    return pending;
  }

  let job = initialJob();
  let sampleId = initialSampleId();
  let loading = false;
  let error = '';
  let profile = loadGeneratedProfile();

  function updatePastedAd(value) {
    const meta = inferJobMeta(value);
    job = {
      title: meta.title,
      company: meta.company,
      description: value,
      notes: ''
    };
    sampleId = '';
  }

  function loadSample(sample) {
    sampleId = sample.id;
    job = {
      title: sample.title,
      company: sample.company,
      description: combinedJobText(sample),
      notes: ''
    };
  }

  async function evaluate() {
    error = '';
    profile = loadGeneratedProfile();
    if (!profile) {
      error = 'Build or load a work-fit profile before evaluating a job ad.';
      return;
    }
    if (!job.description.trim()) {
      error = 'Paste a job ad before generating a report.';
      return;
    }
    if (sampleId && sampleEvaluations[sampleId]) {
      saveEvaluation({
        ...sampleEvaluations[sampleId],
        id: `${sampleEvaluations[sampleId].id}-${Date.now()}`
      });
      go('results');
      return;
    }
    loading = true;
    try {
      const evaluation = await llmAdapter.evaluateJob(profile, job);
      saveEvaluation(evaluation);
      try {
        const savedEvaluation = await saveCloudEvaluation(profile, evaluation, job);
        saveEvaluation(savedEvaluation);
      } catch (cloudSaveError) {
        console.warn('Cloud evaluation save failed after live evaluation succeeded', cloudSaveError);
      }
      go('results');
    } catch (evaluationError) {
      error = evaluationError?.message || 'The evaluator failed. Your profile and job text are still saved locally if you entered them.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="page">
  <div class="page-heading">
    <div>
      <h1>Evaluate a job ad</h1>
      <p>Paste a role and get a live model analysis with separate scores for fit, callback likelihood, cognitive load, and workstyle risk.</p>
    </div>
    {#if !profile}<Button on:click={() => go('profile')}>Build profile first</Button>{/if}
  </div>
  <AuthPanel compact />
  <div class="sample-row">
    {#each sampleJobs as sample}
      <Button variant="secondary" on:click={() => loadSample(sample)}>{sample.label}: {sample.title}</Button>
    {/each}
  </div>
  {#if sampleId}<div class="success">Sample report ready. Click Generate scored report to view it without signing in.</div>{/if}
  {#if error}<div class="error">{error}</div>{/if}
  <section class="form-panel">
    <label class="field wide">
      <span>Paste the full job ad</span>
      <textarea
        rows="18"
        value={job.description}
        on:input={(event) => updatePastedAd(event.currentTarget.value)}
        placeholder="Paste the title, company, responsibilities, requirements, compensation, location, and any notes about why you are interested."
      ></textarea>
    </label>
    <div class="wide">
      <Button on:click={evaluate} disabled={loading}>{loading ? 'Evaluating...' : 'Generate scored report'}</Button>
    </div>
  </section>
</div>
