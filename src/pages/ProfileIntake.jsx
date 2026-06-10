import { useMemo, useState } from 'react';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import { profileSections, questionCount, needsAdaptiveQuestions } from '../lib/profileScoring';
import { llmAdapter } from '../lib/llmAdapter';
import { loadGeneratedProfile, loadProfileAnswers, saveGeneratedProfile, saveProfileAnswers } from '../lib/storage';
import { sampleProfileAnswers } from '../data/sampleProfiles';
import { saveCloudProfile } from '../lib/firebaseClient';

const includesAny = (value, terms) => terms.some((term) => String(value || '').toLowerCase().includes(term));
const asText = (value) => Array.isArray(value) ? value.join(' ') : String(value || '');
const clamp = (value) => Math.min(100, Math.max(0, value));

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

function ProfileReview({ profile, onEdit, onEvaluate }) {
  return (
    <>
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
        <Button variant="secondary" onClick={onEdit}>Edit intake responses</Button>
      </div>
    </>
  );
}

export default function ProfileIntake({ go }) {
  const savedProfile = loadGeneratedProfile();
  const [answers, setAnswers] = useState(loadProfileAnswers());
  const [sectionIndex, setSectionIndex] = useState(0);
  const [profile, setProfile] = useState(savedProfile);
  const [editing, setEditing] = useState(!savedProfile);
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
    setNotice('Sample answers loaded. Generate the profile to update this view.');
  };

  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <h1>{profile && !editing ? 'Your work-fit profile' : 'Create your work-fit profile'}</h1>
          <p>{profile && !editing ? 'Review the generated profile the evaluator uses for job-fit analysis.' : 'Answer 24 focused questions. Save and resume anytime. Longer, concrete answers produce higher confidence.'}</p>
        </div>
        <div className="split-actions compact">
          {profile && !editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit responses</Button>}
          <Button variant="secondary" onClick={useSample}>Load sample profile</Button>
        </div>
      </div>
      <AuthPanel compact />
      {notice && <div className="success">{notice}</div>}
      {error && <div className="error">{error}</div>}
      {!editing && profile ? (
        <ProfileReview profile={profile} onEdit={() => setEditing(true)} onEvaluate={() => go('evaluator')} />
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
