import { useMemo, useState } from 'react';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import { profileSections, questionCount, needsAdaptiveQuestions } from '../lib/profileScoring';
import { llmAdapter } from '../lib/llmAdapter';
import { loadProfileAnswers, saveGeneratedProfile, saveProfileAnswers } from '../lib/storage';
import { sampleProfileAnswers } from '../data/sampleProfiles';

export default function ProfileIntake({ go }) {
  const [answers, setAnswers] = useState(loadProfileAnswers());
  const [sectionIndex, setSectionIndex] = useState(0);
  const [profile, setProfile] = useState(null);
  const [adaptive, setAdaptive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setLoading(true);
    try {
      const generated = await llmAdapter.generateProfileSummary(answers);
      saveGeneratedProfile(generated);
      setProfile(generated);
      setAdaptive(needsAdaptiveQuestions(generated) ? await llmAdapter.generateAdaptiveQuestions(generated, null, generated.confidence_score) : []);
    } catch (profileError) {
      setError(profileError?.message || 'The final profile generator failed. Your answers are still saved locally.');
    } finally {
      setLoading(false);
    }
  };

  const useSample = () => {
    setAnswers(sampleProfileAnswers);
    saveProfileAnswers(sampleProfileAnswers);
  };

  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <h1>Build your work-fit profile</h1>
          <p>Answer 24 focused questions. Save and resume anytime. Longer, concrete answers produce higher confidence.</p>
        </div>
        <Button variant="secondary" onClick={useSample}>Load sample profile</Button>
      </div>
      <AuthPanel compact />
      <div className="progress-wrap">
        <div className="progress-label"><span>{answeredCount} of {questionCount} answered</span><strong>{progress}%</strong></div>
        <div className="progress"><span style={{ width: `${progress}%` }} /></div>
      </div>
      {error && <div className="error">{error}</div>}
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
          <h2>Profile created</h2>
          <p><strong>Confidence:</strong> {profile.confidence_score}/100</p>
          {profile.missing_information.length > 0 && <p><strong>Missing information:</strong> {profile.missing_information.join(', ')}</p>}
          {adaptive.length > 0 && (
            <div>
              <h3>Adaptive follow-up questions</h3>
              <ul>{adaptive.map((question) => <li key={question}>{question}</li>)}</ul>
            </div>
          )}
          <Button onClick={() => go('evaluator')}>Evaluate a job ad</Button>
        </section>
      )}
    </div>
  );
}
