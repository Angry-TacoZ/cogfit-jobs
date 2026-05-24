import { useState } from 'react';
import Button from '../components/Button';
import { sampleJobs } from '../data/sampleJobs';
import { llmAdapter } from '../lib/llmAdapter';
import { loadGeneratedProfile, saveEvaluation } from '../lib/storage';

const emptyJob = { title: '', company: '', description: '', notes: '' };

export default function JobEvaluator({ go }) {
  const [job, setJob] = useState(emptyJob);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profile = loadGeneratedProfile();

  const update = (key, value) => setJob((current) => ({ ...current, [key]: value }));

  const loadSample = (sample) => setJob({
    title: sample.title,
    company: sample.company,
    description: sample.description,
    notes: sample.notes
  });

  const evaluate = async () => {
    setError('');
    if (!profile) {
      setError('Build or load a work-fit profile before evaluating a job ad.');
      return;
    }
    if (!job.title.trim() || !job.description.trim()) {
      setError('Add at least a job title and job description.');
      return;
    }
    setLoading(true);
    try {
      const evaluation = await llmAdapter.evaluateJob(profile, job);
      saveEvaluation(evaluation);
      go('results');
    } catch {
      setError('The evaluator failed. Your profile and job text are still saved locally if you entered them.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Evaluate a job ad</h1>
          <p>Paste a role and get separate scores for fit, callback likelihood, cognitive load, and workstyle risk.</p>
        </div>
        {!profile && <Button onClick={() => go('profile')}>Build profile first</Button>}
      </div>
      <div className="sample-row">
        {sampleJobs.map((sample) => (
          <Button key={sample.id} variant="secondary" onClick={() => loadSample(sample)}>{sample.label}: {sample.title}</Button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      <section className="form-panel two-col">
        <label className="field">
          <span>Job title</span>
          <input value={job.title} onChange={(event) => update('title', event.target.value)} />
        </label>
        <label className="field">
          <span>Company</span>
          <input value={job.company} onChange={(event) => update('company', event.target.value)} />
        </label>
        <label className="field wide">
          <span>Job description text</span>
          <textarea rows={13} value={job.description} onChange={(event) => update('description', event.target.value)} />
        </label>
        <label className="field wide">
          <span>Optional notes about why you are interested</span>
          <textarea rows={4} value={job.notes} onChange={(event) => update('notes', event.target.value)} />
        </label>
        <div className="wide">
          <Button onClick={evaluate} disabled={loading}>{loading ? 'Evaluating...' : 'Generate scored report'}</Button>
        </div>
      </section>
    </div>
  );
}
