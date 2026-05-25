import { useState } from 'react';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import { sampleJobs } from '../data/sampleJobs';
import { sampleEvaluations } from '../data/sampleEvaluations';
import { llmAdapter } from '../lib/llmAdapter';
import { loadGeneratedProfile, saveEvaluation } from '../lib/storage';
import { saveCloudEvaluation } from '../lib/firebaseClient';

const emptyJob = { title: '', company: '', description: '', notes: '' };

function combinedJobText(job) {
  return [
    job.title,
    job.company,
    job.description,
    job.notes && `Interest notes: ${job.notes}`
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

export default function JobEvaluator({ go }) {
  const [job, setJob] = useState(() => {
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
  });
  const [sampleId, setSampleId] = useState(() => {
    const pending = sessionStorage.getItem('cogfit.pendingSampleId');
    if (!pending) return '';
    sessionStorage.removeItem('cogfit.pendingSampleId');
    return pending;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profile = loadGeneratedProfile();

  const updatePastedAd = (value) => {
    const meta = inferJobMeta(value);
    setJob({
      title: meta.title,
      company: meta.company,
      description: value,
      notes: ''
    });
    setSampleId('');
  };

  const loadSample = (sample) => {
    setSampleId(sample.id);
    setJob({
      title: sample.title,
      company: sample.company,
      description: combinedJobText(sample),
      notes: ''
    });
  };

  const evaluate = async () => {
    setError('');
    if (!profile) {
      setError('Build or load a work-fit profile before evaluating a job ad.');
      return;
    }
    if (!job.description.trim()) {
      setError('Paste a job ad before generating a report.');
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
    if (!profile) {
      setError('Build or load a work-fit profile before evaluating a job ad.');
      return;
    }
    setLoading(true);
    try {
      const evaluation = await llmAdapter.evaluateJob(profile, job);
      const savedEvaluation = await saveCloudEvaluation(profile, evaluation, job);
      saveEvaluation(savedEvaluation);
      go('results');
    } catch (evaluationError) {
      setError(evaluationError?.message || 'The evaluator failed. Your profile and job text are still saved locally if you entered them.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Evaluate a job ad</h1>
          <p>Paste a role and get a live model analysis with separate scores for fit, callback likelihood, cognitive load, and workstyle risk.</p>
        </div>
        {!profile && <Button onClick={() => go('profile')}>Build profile first</Button>}
      </div>
      <AuthPanel compact />
      <div className="sample-row">
        {sampleJobs.map((sample) => (
          <Button key={sample.id} variant="secondary" onClick={() => loadSample(sample)}>{sample.label}: {sample.title}</Button>
        ))}
      </div>
      {sampleId && <div className="success">Sample report ready. Click Generate scored report to view it without signing in.</div>}
      {error && <div className="error">{error}</div>}
      <section className="form-panel">
        <label className="field wide">
          <span>Paste the full job ad</span>
          <textarea
            rows={18}
            value={job.description}
            onChange={(event) => updatePastedAd(event.target.value)}
            placeholder="Paste the title, company, responsibilities, requirements, compensation, location, and any notes about why you are interested."
          />
        </label>
        <div className="wide">
          <Button onClick={evaluate} disabled={loading}>{loading ? 'Evaluating...' : 'Generate scored report'}</Button>
        </div>
      </section>
    </div>
  );
}
