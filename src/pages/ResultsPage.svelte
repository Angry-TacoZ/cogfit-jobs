<script>
  import { onMount } from 'svelte';
  import Button from '../components/Button.svelte';
  import ScoreCard from '../components/ScoreCard.svelte';
  import SectionPanel from '../components/SectionPanel.svelte';
  import { evaluationToMarkdown } from '../lib/evaluator';
  import { loadGeneratedProfile, loadEvaluations, mergeEvaluations, saveEvaluations, saveFeedback } from '../lib/storage';
  import { loadCloudEvaluations, saveCloudFeedback, watchAuth } from '../lib/firebaseClient';

  export let go;

  const feedbackOptions = ['accurate', 'too optimistic', 'too pessimistic', 'missed key constraint', 'misunderstood my experience'];

  let evaluations = loadEvaluations();
  let selectedId = evaluations[0]?.id;
  let copied = '';
  let historyStatus = '';
  let profile = loadGeneratedProfile();

  $: evaluation = evaluations.find((item) => item.id === selectedId) || evaluations[0];
  $: markdown = evaluation ? evaluationToMarkdown(evaluation) : '';

  onMount(() => {
    let stopped = false;
    let unsubscribe;

    watchAuth((user) => {
      if (!user) return;
      loadCloudEvaluations()
        .then((cloudEvaluations) => {
          if (stopped || cloudEvaluations.length === 0) return;
          const merged = mergeEvaluations(cloudEvaluations, evaluations);
          evaluations = merged;
          saveEvaluations(merged);
          selectedId = selectedId || merged[0]?.id;
        })
        .catch(() => {
          if (!stopped) {
            historyStatus = 'Saved evaluation history could not be refreshed. Local results are still available.';
          }
        });
    }).then((unwatch) => {
      unsubscribe = unwatch;
    }).catch(() => {
      if (!stopped) {
        historyStatus = 'Saved evaluation history could not be refreshed. Local results are still available.';
      }
    });

    return () => {
      stopped = true;
      if (unsubscribe) unsubscribe();
    };
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      copied = 'Report copied to clipboard.';
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      copied = ok ? 'Report copied to clipboard.' : 'Copy was blocked by the browser. Export Markdown still works.';
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${evaluation.jobTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cogfit-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function feedback(value) {
    saveFeedback(evaluation.id, value);
    if (profile?.profile_id && evaluation?.id) {
      try {
        await saveCloudFeedback(profile.profile_id, evaluation.id, value);
      } catch {
        copied = 'Feedback saved locally. Cloud feedback sync failed.';
        return;
      }
    }
    copied = 'Feedback captured. Future versions should use this to adjust your profile and scoring weights.';
  }
</script>

{#if !evaluation}
  <div class="page narrow empty-state">
    <h1>No evaluation yet</h1>
    <p>Build a profile and evaluate a job ad to create your first scored report.</p>
    <Button on:click={() => go('profile')}>Start profile intake</Button>
  </div>
{:else}
  <div class="page">
    <div class="page-heading">
      <div>
        <h1>{evaluation.jobTitle}</h1>
        <p>{evaluation.company}</p>
      </div>
      <div class="hero-actions compact">
        <Button variant="secondary" on:click={copy}>Copy Markdown</Button>
        <Button variant="secondary" on:click={download}>Export Markdown</Button>
        <Button on:click={() => go('evaluator')}>Run another job ad</Button>
      </div>
    </div>
    <div class="results-toolbar">
      {#if evaluations.length > 1}
        <label class="field inline-select">
          <span>Past evaluations</span>
          <select bind:value={selectedId}>
            {#each evaluations as item}
              <option value={item.id}>{item.jobTitle} at {item.company}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
    {#if historyStatus}<div class="error">{historyStatus}</div>{/if}
    {#if copied}<div class="success">{copied}</div>{/if}
    <section class={`recommendation ${evaluation.decision.toLowerCase()}`}>
      <strong>{evaluation.decision}</strong>
      <p>{evaluation.overallRecommendation}</p>
    </section>
    <section class="score-grid">
      <ScoreCard label="Role Fit Score" value={evaluation.scores.roleFit} />
      <ScoreCard label="Callback Likelihood" value={evaluation.scores.callbackLikelihood} />
      <ScoreCard label="Cognitive Fit Score" value={evaluation.scores.cognitiveFit} />
      <ScoreCard label="Culture / Workstyle Risk" value={evaluation.scores.workstyleRisk} tone="risk" />
      <ScoreCard label="Systems-Thinking Match" value={evaluation.scores.systemsMatch} />
      <ScoreCard label="Confidence Level" value={evaluation.scores.confidence} />
    </section>
    <section class="detail-grid">
      <SectionPanel title={`Why Role Fit is ${evaluation.scores.roleFit}`} defaultOpen>
        <p>{evaluation.sections.skillsEvidenceMatch}</p>
        <p>{evaluation.sections.resumePositioningAngle}</p>
      </SectionPanel>
      <SectionPanel title={`Why Callback Likelihood is ${evaluation.scores.callbackLikelihood}`} defaultOpen>
        <p>{evaluation.sections.resumePositioningAngle}</p>
        <h3>What could improve the screen</h3>
        <ul>{#each evaluation.sections.evidenceToAdd as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
      <SectionPanel title={`Why Cognitive Fit is ${evaluation.scores.cognitiveFit}`} defaultOpen>
        <p>{evaluation.sections.dayToDayReality}</p>
      </SectionPanel>
      <SectionPanel title={`Why Workstyle Risk is ${evaluation.scores.workstyleRisk}`} defaultOpen>
        <ul>{#each evaluation.sections.potentialRisks as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
      <SectionPanel title={`Why Systems Match is ${evaluation.scores.systemsMatch}`}>
        <p>{evaluation.sections.systemsThinkingMatch}</p>
      </SectionPanel>
      <SectionPanel title={`Why Skills Evidence is ${evaluation.scores.skillsEvidence}`}>
        <p>{evaluation.sections.skillsEvidenceMatch}</p>
        <ul>{#each evaluation.sections.evidenceToAdd as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
      <SectionPanel title={`Why Confidence is ${evaluation.scores.confidence}`}>
        <ul>
          {#each [...evaluation.assumptions, ...evaluation.missingInformation.map((item) => `Missing: ${item}`)] as item}
            <li>{item}</li>
          {/each}
        </ul>
      </SectionPanel>
      <SectionPanel title="Interview Talking Points">
        <ul>{#each evaluation.sections.interviewTalkingPoints as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
      <SectionPanel title="What to verify before applying">
        <ul>{#each evaluation.sections.verifyBeforeApplying as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
      <SectionPanel title="What would improve this score?">
        <ul>{#each evaluation.sections.improveScore as item}<li>{item}</li>{/each}</ul>
      </SectionPanel>
    </section>
    <section class="feedback">
      <h2>Was this analysis accurate?</h2>
      <div class="sample-row">
        {#each feedbackOptions as option}
          <Button variant="secondary" on:click={() => feedback(option)}>{option}</Button>
        {/each}
      </div>
    </section>
  </div>
{/if}
