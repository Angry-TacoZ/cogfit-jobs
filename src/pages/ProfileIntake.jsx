import { useMemo, useState } from 'react';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import { profileSections, questionCount, needsAdaptiveQuestions } from '../lib/profileScoring';
import { llmAdapter } from '../lib/llmAdapter';
import {
  loadGeneratedProfile,
  loadProfileAnswers,
  loadResumeEvidence,
  loadResumeText,
  saveGeneratedProfile,
  saveProfileAnswers,
  saveResumeEvidence,
  saveResumeText
} from '../lib/storage';
import { buildResumeBaselineProfile, buildResumeSeedAnswers, extractResumeEvidence } from '../lib/resumeEvidence';
import { sampleProfileAnswers } from '../data/sampleProfiles';
import { saveCloudProfile } from '../lib/firebaseClient';

const includesAny = (value, terms) => terms.some((term) => String(value || '').toLowerCase().includes(term));
const asText = (value) => Array.isArray(value) ? value.join(' ') : String(value || '');
const clamp = (value) => Math.min(100, Math.max(0, value));
const calibrationQuestionIds = ['q3', 'q8', 'q9', 'q13', 'q14', 'q17', 'q21', 'q24'];
const calibrationQuestions = profileSections
  .flatMap((section) => section.questions)
  .filter(([id]) => calibrationQuestionIds.includes(id));

function buildWorkProfileWeights(profile) {
  const energizers = asText(profile?.energizers);
  const drainers = asText(profile?.drainers);
  const structure = `${profile?.preferred_problem_structure || ''} ${profile?.autonomy_needs || ''}`;
  const communication = `${asText(profile?.communication_preferences)} ${profile?.interaction_limits || ''}`;
  const evidence = `${asText(profile?.strongest_evidence)} ${asText(profile?.tools_and_skills)} ${asText(profile?.negative_fit_patterns)}`;
  const flags = profile?.inferred_flags || {};

  return [
    {
      label: 'Problem shape',
      left: 'Clear tasks',
      right: 'Ambiguous ownership',
      value: clamp(48 + (flags.likes_ambiguity ? 22 : 0) + (includesAny(structure, ['ambiguous', 'ownership', 'messy', 'unclear']) ? 16 : 0) - (includesAny(structure, ['clear task', 'defined']) ? 12 : 0))
    },
    {
      label: 'Primary work mode',
      left: 'Repeat process',
      right: 'Build and redesign',
      value: clamp(45 + (includesAny(energizers, ['build', 'create', 'prototype', 'automate']) ? 18 : 0) + (includesAny(evidence, ['app', 'automation', 'api', 'workflow', 'tool']) ? 15 : 0) - (includesAny(drainers, ['repetitive', 'volume', 'support queue']) ? 6 : 0))
    },
    {
      label: 'Communication load',
      left: 'Live interaction',
      right: 'Async writing',
      value: clamp(44 + (flags.prefers_async ? 20 : 0) + (includesAny(communication, ['writing', 'async', 'documentation', 'demo']) ? 16 : 0) - (includesAny(communication, ['phone', 'camera', 'live customer']) ? 12 : 0))
    },
    {
      label: 'Autonomy need',
      left: 'Managed structure',
      right: 'Independent ownership',
      value: clamp(46 + (includesAny(structure, ['ownership', 'autonomy', 'act', 'decide']) ? 22 : 0) + (includesAny(energizers, ['ownership', 'problem', 'system']) ? 10 : 0) - (includesAny(drainers, ['micromanage', 'approval', 'trapped']) ? 8 : 0))
    },
    {
      label: 'System preference',
      left: 'Operate stable system',
      right: 'Improve broken system',
      value: clamp(44 + (includesAny(evidence, ['improve', 'fix', 'redesign', 'workflow', 'system', 'dashboard']) ? 18 : 0) + (includesAny(energizers, ['broken', 'system', 'diagnose']) ? 14 : 0))
    },
    {
      label: 'Role center',
      left: 'Sales or support load',
      right: 'Technical creation',
      value: clamp(50 + (includesAny(evidence, ['python', 'javascript', 'react', 'firebase', 'sql', 'api', 'power bi']) ? 18 : 0) + (flags.avoids_sales_pressure ? 12 : 0) + (includesAny(drainers, ['sales', 'quota', 'call volume']) ? 8 : 0))
    }
  ];
}

function ProfileList({ title, items }) {
  const values = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (!values.length) return null;

  return (
    <section className="profile-card">
      <h3>{title}</h3>
      <div className="chip-list">
        {values.map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

function ResumeEvidenceSummary({ evidence }) {
  if (!evidence) return null;

  return (
    <section className="profile-panel resume-evidence-panel">
      <div className="profile-panel-heading">
        <div>
          <h2>Resume evidence imported</h2>
          <p>These facts seed the baseline profile. Calibration questions refine workstyle and sustainability.</p>
        </div>
        <strong>{evidence.confidence || 0}/100 evidence confidence</strong>
      </div>
      <div className="profile-grid compact-grid">
        <ProfileList title="Tools and systems found" items={evidence.tools} />
        <ProfileList title="Evidence categories" items={evidence.evidence} />
        <ProfileList title="Domains detected" items={evidence.domains} />
        <ProfileList title="Titles detected" items={evidence.titles} />
      </div>
    </section>
  );
}

function ProfileWeights({ profile }) {
  return (
    <section className="profile-panel">
      <div className="profile-panel-heading">
        <div>
          <h2>Work profile weights</h2>
          <p>These ranges show the evaluator's current read of your sustainable work style.</p>
        </div>
        <strong>{profile.confidence_score || 0}/100 confidence</strong>
      </div>
      <div className="weight-list">
        {buildWorkProfileWeights(profile).map((weight) => (
          <div className="weight-row" key={weight.label}>
            <div className="weight-title">
              <strong>{weight.label}</strong>
              <span>{weight.value}/100</span>
            </div>
            <div className="weight-track" aria-label={`${weight.label}: ${weight.value} out of 100`}>
              <span className="weight-end left">{weight.left}</span>
              <span className="weight-end right">{weight.right}</span>
              <span className="weight-line" />
              <span className="weight-marker" style={{ left: `${weight.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileReview({ profile, evidence, onEdit, onEvaluate }) {
  return (
    <>
      <ResumeEvidenceSummary evidence={evidence} />
      <ProfileWeights profile={profile} />
      <div className="profile-grid">
        <ProfileList title="Target role families" items={profile.target_role_families} />
        <ProfileList title="Strongest evidence" items={profile.strongest_evidence} />
        <ProfileList title="Tools and skills" items={profile.tools_and_skills} />
        <ProfileList title="Energizers" items={profile.energizers} />
        <ProfileList title="Drainers" items={profile.drainers} />
        <ProfileList title="Communication preferences" items={profile.communication_preferences} />
        <ProfileList title="Negative fit patterns" items={profile.negative_fit_patterns} />
        <ProfileList title="Hidden costs" items={profile.hidden_costs} />
      </div>
      {profile.missing_information?.length > 0 && (
        <section className="profile-card">
          <h3>Missing information</h3>
          <ul>{profile.missing_information.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}
      <div className="split-actions profile-actions">
        <Button onClick={onEvaluate}>Evaluate a job ad</Button>
        <Button variant="secondary" onClick={onEdit}>Improve matching</Button>
      </div>
    </>
  );
}

function ResumeImportPanel({ resumeText, loading, onTextChange, onFileUpload, onCreateBaseline, onShowQuestions }) {
  const ready = resumeText.trim().length >= 400;

  return (
    <section className="form-panel resume-start-panel">
      <div className="resume-start-grid">
        <div>
          <h2>Start with your resume</h2>
          <p>Paste your resume or upload a DOCX or text file. CogFit Jobs will extract a baseline evidence profile first, then ask a few calibration questions for workstyle precision.</p>
          <div className="resume-step-list" aria-label="Resume-first flow">
            <span>1. Import resume evidence</span>
            <span>2. Review baseline profile</span>
            <span>3. Answer targeted calibration questions</span>
          </div>
        </div>
        <label className="upload-box">
          <span>Upload resume</span>
          <input type="file" accept=".docx,.txt,.md,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileUpload} />
          <small>DOCX and plain text are supported in this prototype.</small>
        </label>
      </div>
      <label className="field wide">
        <span>Resume text</span>
        <textarea
          rows={14}
          value={resumeText}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste your resume text here, or upload a DOCX file above."
        />
      </label>
      <div className="resume-import-footer">
        <span>{resumeText.trim().length.toLocaleString()} characters imported</span>
        <div className="split-actions compact">
          <Button onClick={onCreateBaseline} disabled={loading || !ready}>{loading ? 'Reading resume...' : 'Create baseline profile'}</Button>
          <Button variant="secondary" onClick={onShowQuestions}>Skip to full intake</Button>
        </div>
      </div>
      {!ready && <p className="hint-text">A longer resume sample gives the extractor enough evidence to build a useful baseline.</p>}
    </section>
  );
}

function CalibrationPanel({ answers, progress, loading, onUpdate, onSave, onShowFullIntake }) {
  const answeredCalibration = calibrationQuestions.filter(([id]) => String(answers[id] || '').trim()).length;

  return (
    <>
      <div className="progress-wrap">
        <div className="progress-label">
          <span>{answeredCalibration} of {calibrationQuestions.length} calibration questions answered</span>
          <strong>{progress}% full profile</strong>
        </div>
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <section className="form-panel">
        <h2>Improve matching precision</h2>
        <p className="panel-subcopy">The resume gives evidence. These questions tell the evaluator what work is sustainable, draining, or a hard constraint.</p>
        {calibrationQuestions.map(([id, label]) => (
          <label className="field" key={id}>
            <span>{label}</span>
            <textarea value={answers[id] || ''} onChange={(event) => onUpdate(id, event.target.value)} rows={4} />
          </label>
        ))}
        <div className="split-actions">
          <Button onClick={onSave} disabled={loading}>{loading ? 'Updating profile...' : 'Update profile'}</Button>
          <Button variant="secondary" onClick={onShowFullIntake}>Open full 24-question intake</Button>
        </div>
      </section>
    </>
  );
}

export default function ProfileIntake({ go }) {
  const savedProfile = loadGeneratedProfile();
  const [answers, setAnswers] = useState(loadProfileAnswers());
  const [resumeText, setResumeText] = useState(loadResumeText());
  const [resumeEvidence, setResumeEvidence] = useState(loadResumeEvidence());
  const [sectionIndex, setSectionIndex] = useState(0);
  const [profile, setProfile] = useState(savedProfile);
  const [editing, setEditing] = useState(!savedProfile);
  const [intakeMode, setIntakeMode] = useState(savedProfile ? 'calibration' : 'resume');
  const [adaptive, setAdaptive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const section = profileSections[sectionIndex];
  const answeredCount = useMemo(() => Object.values(answers).filter((value) => String(value || '').trim()).length, [answers]);
  const progress = Math.round((answeredCount / questionCount) * 100);

  const update = (id, value) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    saveProfileAnswers(next);
  };

  const updateResumeText = (value) => {
    setResumeText(value);
    saveResumeText(value);
  };

  const uploadResume = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (file.name.toLowerCase().endsWith('.docx')) {
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        updateResumeText(result.value || '');
      } else {
        updateResumeText(await file.text());
      }
      setNotice(`Imported ${file.name}. Review the text, then create the baseline profile.`);
    } catch (uploadError) {
      setError(uploadError?.message || 'Resume upload failed. Paste the resume text instead.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const createBaselineProfile = () => {
    setError('');
    setNotice('');
    const text = resumeText.trim();
    if (text.length < 400) {
      setError('Add more resume text before creating the baseline profile.');
      return;
    }

    const evidence = extractResumeEvidence(text);
    const seededAnswers = { ...answers, ...buildResumeSeedAnswers(evidence) };
    const baseline = buildResumeBaselineProfile(evidence);
    setResumeEvidence(evidence);
    saveResumeEvidence(evidence);
    setAnswers(seededAnswers);
    saveProfileAnswers(seededAnswers);
    setProfile(baseline);
    saveGeneratedProfile(baseline);
    setEditing(false);
    setIntakeMode('calibration');
    setAdaptive([]);
    setNotice('Baseline profile created from resume evidence. Answer calibration questions to improve workstyle precision.');
  };

  const saveProfile = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const generated = await llmAdapter.generateProfileSummary(answers);
      saveGeneratedProfile(generated);
      setProfile(generated);
      setEditing(false);
      setAdaptive(needsAdaptiveQuestions(generated) ? await llmAdapter.generateAdaptiveQuestions(generated, null, generated.confidence_score) : []);

      if (generated.profile_generation_mode === 'local_first_pass') {
        setNotice(`Profile created with local first-pass scoring because live Gemini profile generation failed. ${generated.live_profile_error}`);
      }

      try {
        const savedCloudProfile = await saveCloudProfile(generated, answers);
        saveGeneratedProfile(savedCloudProfile);
        setProfile(savedCloudProfile);
      } catch (cloudSaveError) {
        setNotice((currentNotice) => [
          currentNotice,
          `Profile is usable locally, but cloud save failed. ${cloudSaveError?.message || 'Try again later.'}`
        ].filter(Boolean).join(' '));
      }
    } catch (profileError) {
      setError(profileError?.message || 'The final profile generator failed. Your answers are still saved locally.');
    } finally {
      setLoading(false);
    }
  };

  const useSample = () => {
    setAnswers(sampleProfileAnswers);
    saveProfileAnswers(sampleProfileAnswers);
    setEditing(true);
    setIntakeMode('questions');
    setNotice('Sample answers loaded. Generate the profile to update this view.');
  };

  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <h1>{profile && !editing ? 'Your work-fit profile' : intakeMode === 'resume' ? 'Create your profile from a resume' : 'Refine your work-fit profile'}</h1>
          <p>{profile && !editing ? 'Review the generated profile the evaluator uses for job-fit analysis.' : intakeMode === 'resume' ? 'Start with resume evidence, then answer a few calibration questions for better matching.' : 'Answer the questions that improve workstyle, constraints, and bad-fit precision.'}</p>
        </div>
        <div className="split-actions compact">
          <Button variant="secondary" onClick={useSample}>Load sample profile</Button>
        </div>
      </div>
      <AuthPanel compact />
      {notice && <div className="success">{notice}</div>}
      {error && <div className="error">{error}</div>}
      {!editing && profile ? (
        <ProfileReview profile={profile} evidence={resumeEvidence} onEdit={() => { setEditing(true); setIntakeMode('calibration'); }} onEvaluate={() => go('evaluator')} />
      ) : intakeMode === 'resume' ? (
        <ResumeImportPanel
          resumeText={resumeText}
          loading={loading}
          onTextChange={updateResumeText}
          onFileUpload={uploadResume}
          onCreateBaseline={createBaselineProfile}
          onShowQuestions={() => setIntakeMode('questions')}
        />
      ) : intakeMode === 'calibration' ? (
        <CalibrationPanel
          answers={answers}
          progress={progress}
          loading={loading}
          onUpdate={update}
          onSave={saveProfile}
          onShowFullIntake={() => setIntakeMode('questions')}
        />
      ) : (
        <>
          <div className="progress-wrap">
            <div className="progress-label"><span>{answeredCount} of {questionCount} answered</span><strong>{progress}%</strong></div>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <section className="form-panel">
            <h2>{section.title}</h2>
            {section.questions.map(([id, label]) => (
              <label className="field" key={id}>
                <span>{label}</span>
                <textarea value={answers[id] || ''} onChange={(event) => update(id, event.target.value)} rows={4} />
              </label>
            ))}
            <div className="split-actions">
              <Button variant="secondary" onClick={() => setSectionIndex(Math.max(0, sectionIndex - 1))} disabled={sectionIndex === 0}>Previous</Button>
              {sectionIndex < profileSections.length - 1 ? (
                <Button onClick={() => setSectionIndex(sectionIndex + 1)}>Next section</Button>
              ) : (
                <Button onClick={saveProfile} disabled={loading}>{loading ? 'Generating with Gemini...' : 'Generate final work-fit profile'}</Button>
              )}
            </div>
          </section>
          {profile && (
            <section className="result-summary">
              <h2>Profile updated</h2>
              <p><strong>Confidence:</strong> {profile.confidence_score}/100</p>
              {profile.missing_information.length > 0 && <p><strong>Missing information:</strong> {profile.missing_information.join(', ')}</p>}
              {adaptive.length > 0 && (
                <div>
                  <h3>Adaptive follow-up questions</h3>
                  <ul>{adaptive.map((question) => <li key={question}>{question}</li>)}</ul>
                </div>
              )}
              <Button onClick={() => setEditing(false)}>Return to profile view</Button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
