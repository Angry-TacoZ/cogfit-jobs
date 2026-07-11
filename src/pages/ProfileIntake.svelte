<script>
  import Button from '../components/Button.svelte';
  import AuthPanel from '../components/AuthPanel.svelte';
  import ProfileList from '../components/ProfileList.svelte';
  import ProfileWeights from '../components/ProfileWeights.svelte';
  import { profileSections, questionCount, needsAdaptiveQuestions } from '../lib/profileScoring';
  import { llmAdapter } from '../lib/llmAdapter';
  import { loadGeneratedProfile, loadProfileAnswers, saveGeneratedProfile, saveProfileAnswers } from '../lib/storage';
  import { sampleProfileAnswers } from '../data/sampleProfiles';
  import { saveCloudProfile } from '../lib/firebaseClient';

  export let go;

  let answers = loadProfileAnswers();
  let sectionIndex = 0;
  let profile = loadGeneratedProfile();
  let editing = !profile;
  let adaptive = [];
  let loading = false;
  let error = '';
  let notice = '';

  $: section = profileSections[sectionIndex];
  $: answeredCount = Object.values(answers).filter((value) => String(value || '').trim()).length;
  $: progress = Math.round((answeredCount / questionCount) * 100);

  function update(id, value) {
    answers = { ...answers, [id]: value };
    saveProfileAnswers(answers);
  }

  async function saveProfile() {
    error = '';
    notice = '';
    loading = true;
    try {
      const generated = await llmAdapter.generateProfileSummary(answers);
      saveGeneratedProfile(generated);
      profile = generated;
      editing = false;
      adaptive = needsAdaptiveQuestions(generated)
        ? await llmAdapter.generateAdaptiveQuestions(generated, null, generated.confidence_score)
        : [];

      if (generated.profile_generation_mode === 'local_first_pass') {
        notice = `Profile created with local first-pass scoring because live Gemini profile generation failed. ${generated.live_profile_error}`;
      }

      try {
        const savedCloudProfile = await saveCloudProfile(generated, answers);
        saveGeneratedProfile(savedCloudProfile);
        profile = savedCloudProfile;
      } catch (cloudSaveError) {
        notice = [
          notice,
          `Profile is usable locally, but cloud save failed. ${cloudSaveError?.message || 'Try again later.'}`
        ].filter(Boolean).join(' ');
      }
    } catch (profileError) {
      error = profileError?.message || 'The final profile generator failed. Your answers are still saved locally.';
    } finally {
      loading = false;
    }
  }

  function useSample() {
    answers = sampleProfileAnswers;
    saveProfileAnswers(sampleProfileAnswers);
    editing = true;
    notice = 'Sample answers loaded. Generate the profile to update this view.';
  }
</script>

<div class="page narrow">
  <div class="page-heading">
    <div>
      <h1>{profile && !editing ? 'Your work-fit profile' : 'Create your work-fit profile'}</h1>
      <p>{profile && !editing ? 'Review the generated profile the evaluator uses for job-fit analysis.' : 'Answer 24 focused questions. Save and resume anytime. Longer, concrete answers produce higher confidence.'}</p>
    </div>
    <div class="split-actions compact">
      {#if profile && !editing}
        <Button variant="secondary" on:click={() => editing = true}>Edit responses</Button>
      {/if}
      <Button variant="secondary" on:click={useSample}>Load sample profile</Button>
    </div>
  </div>
  <AuthPanel compact />
  {#if notice}<div class="success">{notice}</div>{/if}
  {#if error}<div class="error">{error}</div>{/if}
  {#if !editing && profile}
    <ProfileWeights {profile} />
    <div class="profile-grid">
      <ProfileList title="Target role families" items={profile.target_role_families} />
      <ProfileList title="Strongest evidence" items={profile.strongest_evidence} />
      <ProfileList title="Tools and skills" items={profile.tools_and_skills} />
      <ProfileList title="Energizers" items={profile.energizers} />
      <ProfileList title="Drainers" items={profile.drainers} />
      <ProfileList title="Communication preferences" items={profile.communication_preferences} />
      <ProfileList title="Negative fit patterns" items={profile.negative_fit_patterns} />
      <ProfileList title="Hidden costs" items={profile.hidden_costs} />
    </div>
    {#if profile.missing_information?.length > 0}
      <section class="profile-card">
        <h3>Missing information</h3>
        <ul>{#each profile.missing_information as item}<li>{item}</li>{/each}</ul>
      </section>
    {/if}
    <div class="split-actions profile-actions">
      <Button on:click={() => go('evaluator')}>Evaluate a job ad</Button>
      <Button variant="secondary" on:click={() => editing = true}>Edit intake responses</Button>
    </div>
  {:else}
    <div class="progress-wrap">
      <div class="progress-label"><span>{answeredCount} of {questionCount} answered</span><strong>{progress}%</strong></div>
      <div class="progress"><span style={`width: ${progress}%`}></span></div>
    </div>
    <section class="form-panel">
      <h2>{section.title}</h2>
      {#each section.questions as [id, label]}
        <label class="field">
          <span>{label}</span>
          <textarea value={answers[id] || ''} on:input={(event) => update(id, event.currentTarget.value)} rows="4"></textarea>
        </label>
      {/each}
      <div class="split-actions">
        <Button variant="secondary" on:click={() => sectionIndex = Math.max(0, sectionIndex - 1)} disabled={sectionIndex === 0}>Previous</Button>
        {#if sectionIndex < profileSections.length - 1}
          <Button on:click={() => sectionIndex += 1}>Next section</Button>
        {:else}
          <Button on:click={saveProfile} disabled={loading}>{loading ? 'Generating with Gemini...' : 'Generate final work-fit profile'}</Button>
        {/if}
      </div>
    </section>
    {#if profile}
      <section class="result-summary">
        <h2>Profile updated</h2>
        <p><strong>Confidence:</strong> {profile.confidence_score}/100</p>
        {#if profile.missing_information.length > 0}
          <p><strong>Missing information:</strong> {profile.missing_information.join(', ')}</p>
        {/if}
        {#if adaptive.length > 0}
          <div>
            <h3>Adaptive follow-up questions</h3>
            <ul>{#each adaptive as question}<li>{question}</li>{/each}</ul>
          </div>
        {/if}
        <Button on:click={() => editing = false}>Return to profile view</Button>
      </section>
    {/if}
  {/if}
</div>
