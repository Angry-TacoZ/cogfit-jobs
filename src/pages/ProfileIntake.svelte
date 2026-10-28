<script>
  import { onMount } from 'svelte';
  import Button from '../components/Button.svelte';
  import AuthPanel from '../components/AuthPanel.svelte';
  import ProfileList from '../components/ProfileList.svelte';
  import ProfileWeights from '../components/ProfileWeights.svelte';
  import { profileSections, questionCount, needsAdaptiveQuestions } from '../lib/profileScoring';
  import { llmAdapter } from '../lib/llmAdapter';
  import {
    clearResumeImport,
    clearResumeText,
    loadGeneratedProfile,
    loadProfileAnswers,
    loadResumeEvidence,
    saveGeneratedProfile,
    saveProfileAnswers,
    saveResumeEvidence
  } from '../lib/storage';
  import {
    assertResumeFileSize,
    buildResumeBaselineProfile,
    buildResumeSeedAnswers,
    extractResumeEvidence,
    hasUsableResumeEvidence
  } from '../lib/resumeEvidence';
  import { sampleProfileAnswers } from '../data/sampleProfiles';
  import { saveCloudProfile } from '../lib/firebaseClient';

  const calibrationQuestionIds = ['q3', 'q8', 'q9', 'q13', 'q14', 'q17', 'q21', 'q24'];
  const calibrationQuestions = profileSections.flatMap((section) => section.questions)
    .filter(([id]) => calibrationQuestionIds.includes(id));

  export let go;

  const savedProfile = loadGeneratedProfile();
  let answers = loadProfileAnswers();
  let resumeText = '';
  let resumeEvidence = loadResumeEvidence();
  let sectionIndex = 0;
  let profile = savedProfile;
  let editing = !savedProfile;
  let intakeMode = savedProfile ? 'calibration' : 'resume';
  let adaptive = [];
  let loading = false;
  let error = '';
  let notice = '';

  $: section = profileSections[sectionIndex];
  $: answeredCount = Object.values(answers).filter((value) => String(value || '').trim()).length;
  $: progress = Math.round((answeredCount / questionCount) * 100);
  $: calibrationAnsweredCount = calibrationQuestions.filter(([id]) => String(answers[id] || '').trim()).length;

  onMount(() => {
    clearResumeText();
  });

  function update(id, value) {
    answers = { ...answers, [id]: value };
    saveProfileAnswers(answers);
  }

  function clearResumeImportState() {
    resumeEvidence = null;
    resumeText = '';
    clearResumeImport();
  }

  async function uploadResume(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    error = '';
    notice = '';
    loading = true;
    try {
      assertResumeFileSize(file);
      if (file.name.toLowerCase().endsWith('.docx')) {
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        resumeText = result.value || '';
      } else {
        resumeText = await file.text();
      }
      notice = 'Imported ' + file.name + '. Review the text, then create the baseline profile.';
    } catch (uploadError) {
      error = uploadError?.message || 'Resume upload failed. Paste the resume text instead.';
    } finally {
      loading = false;
      input.value = '';
    }
  }

  function createBaselineProfile() {
    error = '';
    notice = '';
    const text = resumeText.trim();
    if (text.length < 400) {
      error = 'Add more resume text before creating the baseline profile.';
      return;
    }

    const evidence = extractResumeEvidence(text);
    if (!hasUsableResumeEvidence(evidence)) {
      error = 'CogFit Jobs could not extract enough concrete evidence from this resume. Try a more detailed resume or continue with the full intake.';
      return;
    }

    const existingAnswers = Object.fromEntries(
      Object.entries(answers).filter(([, value]) => String(value || '').trim())
    );
    const seededAnswers = { ...buildResumeSeedAnswers(evidence), ...existingAnswers };
    const baseline = buildResumeBaselineProfile(evidence);
    resumeText = '';
    clearResumeText();
    resumeEvidence = evidence;
    saveResumeEvidence(evidence);
    answers = seededAnswers;
    saveProfileAnswers(seededAnswers);
    if (!profile) {
      profile = baseline;
      saveGeneratedProfile(baseline);
    }
    editing = true;
    intakeMode = 'calibration';
    adaptive = [];
    notice = profile === baseline
      ? 'Baseline profile created from resume evidence. Answer calibration questions to improve workstyle precision.'
      : 'Resume evidence replaced. Review the calibration answers, then update your profile.';
  }

  async function saveProfile() {
    error = '';
    notice = '';
    loading = true;
    try {
      const generated = await llmAdapter.generateProfileSummary(answers, resumeEvidence);
      saveGeneratedProfile(generated);
      profile = generated;
      editing = false;
      adaptive = needsAdaptiveQuestions(generated)
        ? await llmAdapter.generateAdaptiveQuestions(generated, null, generated.confidence_score)
        : [];

      if (generated.profile_generation_mode === 'local_first_pass') {
        notice = 'Profile created with local first-pass scoring because live Gemini profile generation failed. ' + generated.live_profile_error;
      }

      try {
        const savedCloudProfile = await saveCloudProfile(generated, answers, resumeEvidence);
        saveGeneratedProfile(savedCloudProfile);
        profile = savedCloudProfile;
      } catch (cloudSaveError) {
        notice = [
          notice,
          'Profile is usable locally, but cloud save failed. ' + (cloudSaveError?.message || 'Try again later.')
        ].filter(Boolean).join(' ');
      }
    } catch (profileError) {
      error = profileError?.message || 'The final profile generator failed. Your answers are still saved locally.';
    } finally {
      loading = false;
    }
  }

  function useSample() {
    clearResumeImportState();
    answers = sampleProfileAnswers;
    saveProfileAnswers(sampleProfileAnswers);
    editing = true;
    intakeMode = 'questions';
    notice = 'Sample answers loaded. Generate the profile to update this view.';
  }
</script>

<div class="page narrow">
  <div class="page-heading">
    <div>
      <h1>{profile && !editing ? 'Your work-fit profile' : intakeMode === 'resume' ? 'Create your profile from a resume' : 'Refine your work-fit profile'}</h1>
      <p>{profile && !editing ? 'Review the generated profile the evaluator uses for job-fit analysis.' : intakeMode === 'resume' ? 'Start with resume evidence, then answer a few calibration questions for better matching.' : 'Answer the questions that improve workstyle, constraints, and bad-fit precision.'}</p>
    </div>
    <div class="split-actions compact">
      <Button variant="secondary" on:click={useSample}>Load sample profile</Button>
    </div>
  </div>
  <AuthPanel compact />
  {#if notice}<div class="success">{notice}</div>{/if}
  {#if error}<div class="error">{error}</div>{/if}

  {#if !editing && profile}
    {#if resumeEvidence}
      <section class="profile-panel resume-evidence-panel">
        <div class="profile-panel-heading">
          <div>
            <h2>Resume evidence imported</h2>
            <p>These facts seed the baseline profile. Calibration questions refine workstyle and sustainability.</p>
          </div>
          <strong>{resumeEvidence.confidence || 0}/100 evidence confidence</strong>
        </div>
        <div class="profile-grid compact-grid">
          <ProfileList title="Tools and systems found" items={resumeEvidence.tools} />
          <ProfileList title="Evidence categories" items={resumeEvidence.evidence} />
          <ProfileList title="Domains detected" items={resumeEvidence.domains} />
          <ProfileList title="Titles detected" items={resumeEvidence.titles} />
        </div>
      </section>
    {/if}
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
    {#if adaptive.length}
      <section class="profile-card">
        <h3>Adaptive follow-up questions</h3>
        <ul>{#each adaptive as question}<li>{question}</li>{/each}</ul>
      </section>
    {/if}
    <div class="split-actions profile-actions">
      <Button on:click={() => go('evaluator')}>Evaluate a job ad</Button>
      <Button variant="secondary" on:click={() => { editing = true; intakeMode = 'calibration'; }}>Improve matching</Button>
      <Button variant="secondary" on:click={() => { editing = true; intakeMode = 'resume'; }}>
        {resumeEvidence ? 'Replace resume evidence' : 'Add resume evidence'}
      </Button>
    </div>
  {:else if intakeMode === 'resume'}
    <section class="form-panel resume-start-panel">
      <div class="resume-start-grid">
        <div>
          <h2>Start with your resume</h2>
          <p>Paste your resume or upload a DOCX or text file. CogFit Jobs will extract a baseline evidence profile first, then ask a few calibration questions for workstyle precision.</p>
          <div class="resume-step-list" aria-label="Resume-first flow">
            <span>1. Import resume evidence</span>
            <span>2. Review baseline profile</span>
            <span>3. Answer targeted calibration questions</span>
          </div>
        </div>
        <label class="upload-box">
          <span>Upload resume</span>
          <input type="file" accept=".docx,.txt,.md,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" on:change={uploadResume} />
          <small>DOCX and plain text are supported in this prototype.</small>
        </label>
      </div>
      <label class="field wide">
        <span>Resume text</span>
        <textarea rows="14" bind:value={resumeText} placeholder="Paste your resume text here, or upload a DOCX file above."></textarea>
      </label>
      <div class="resume-import-footer">
        <span>{resumeText.trim().length.toLocaleString()} characters imported</span>
        <div class="split-actions compact">
          <Button on:click={createBaselineProfile} disabled={loading || resumeText.trim().length < 400}>{loading ? 'Reading resume...' : 'Create baseline profile'}</Button>
          <Button variant="secondary" on:click={() => { clearResumeImportState(); intakeMode = 'questions'; }}>Skip to full intake</Button>
        </div>
      </div>
      {#if resumeText.trim().length < 400}
        <p class="hint-text">A longer resume sample gives the extractor enough evidence to build a useful baseline.</p>
      {/if}
    </section>
  {:else if intakeMode === 'calibration'}
    <div class="progress-wrap">
      <div class="progress-label">
        <span>{calibrationAnsweredCount} of {calibrationQuestions.length} calibration questions answered</span>
        <strong>{progress}% full profile</strong>
      </div>
      <div class="progress"><span style="width: {progress}%"></span></div>
    </div>
    <section class="form-panel">
      <h2>Improve matching precision</h2>
      <p class="panel-subcopy">The resume gives evidence. These questions tell the evaluator what work is sustainable, draining, or a hard constraint.</p>
      {#each calibrationQuestions as [id, label]}
        <label class="field">
          <span>{label}</span>
          <textarea value={answers[id] || ''} on:input={(event) => update(id, event.currentTarget.value)} rows="4"></textarea>
        </label>
      {/each}
      <div class="split-actions">
        <Button on:click={saveProfile} disabled={loading}>{loading ? 'Updating profile...' : 'Update profile'}</Button>
        <Button variant="secondary" on:click={() => intakeMode = 'questions'}>Open full 24-question intake</Button>
      </div>
    </section>
  {:else}
    <div class="progress-wrap">
      <div class="progress-label"><span>{answeredCount} of {questionCount} answered</span><strong>{progress}%</strong></div>
      <div class="progress"><span style="width: {progress}%"></span></div>
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
        {#if profile.missing_information?.length > 0}
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
