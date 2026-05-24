import { useState } from 'react';
import Button from '../components/Button';
import ScoreCard from '../components/ScoreCard';
import SectionPanel from '../components/SectionPanel';
import { evaluationToMarkdown } from '../lib/evaluator';
import { loadEvaluations, saveFeedback } from '../lib/storage';

const feedbackOptions = ['accurate', 'too optimistic', 'too pessimistic', 'missed key constraint', 'misunderstood my experience'];

export default function ResultsPage({ go }) {
  const [evaluations] = useState(loadEvaluations());
  const [selectedId, setSelectedId] = useState(evaluations[0]?.id);
  const [copied, setCopied] = useState('');
  const evaluation = evaluations.find((item) => item.id === selectedId) || evaluations[0];

  if (!evaluation) {
    return (
      <div className="page narrow empty-state">
        <h1>No evaluation yet</h1>
        <p>Build a profile and evaluate a job ad to create your first scored report.</p>
        <Button onClick={() => go('profile')}>Start profile intake</Button>
      </div>
    );
  }

  const markdown = evaluationToMarkdown(evaluation);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied('Report copied to clipboard.');
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
      setCopied(ok ? 'Report copied to clipboard.' : 'Copy was blocked by the browser. Export Markdown still works.');
    }
  };
  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${evaluation.jobTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cogfit-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const feedback = (value) => {
    saveFeedback(evaluation.id, value);
    setCopied('Feedback captured. Future versions should use this to adjust your profile and scoring weights.');
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{evaluation.jobTitle}</h1>
          <p>{evaluation.company}</p>
        </div>
        <div className="hero-actions compact">
          <Button variant="secondary" onClick={copy}>Copy Markdown</Button>
          <Button variant="secondary" onClick={download}>Export Markdown</Button>
          <Button onClick={() => go('evaluator')}>Run another job ad</Button>
        </div>
      </div>
      {evaluations.length > 1 && (
        <label className="field inline-select">
          <span>Past evaluations</span>
          <select value={evaluation.id} onChange={(event) => setSelectedId(event.target.value)}>
            {evaluations.map((item) => <option key={item.id} value={item.id}>{item.jobTitle} at {item.company}</option>)}
          </select>
        </label>
      )}
      {copied && <div className="success">{copied}</div>}
      <section className={`recommendation ${evaluation.decision.toLowerCase()}`}>
        <strong>{evaluation.decision}</strong>
        <p>{evaluation.overallRecommendation}</p>
      </section>
      <section className="score-grid">
        <ScoreCard label="Role Fit Score" value={evaluation.scores.roleFit} />
        <ScoreCard label="Callback Likelihood" value={evaluation.scores.callbackLikelihood} />
        <ScoreCard label="Cognitive Fit Score" value={evaluation.scores.cognitiveFit} />
        <ScoreCard label="Culture / Workstyle Risk" value={evaluation.scores.workstyleRisk} tone="risk" />
        <ScoreCard label="Systems-Thinking Match" value={evaluation.scores.systemsMatch} />
        <ScoreCard label="Confidence Level" value={evaluation.scores.confidence} />
      </section>
      <section className="detail-grid">
        <SectionPanel title="Systems-Thinking Match" defaultOpen>{evaluation.sections.systemsThinkingMatch}</SectionPanel>
        <SectionPanel title="Skills & Evidence Match" defaultOpen>{evaluation.sections.skillsEvidenceMatch}</SectionPanel>
        <SectionPanel title="Day-to-Day Reality" defaultOpen>{evaluation.sections.dayToDayReality}</SectionPanel>
        <SectionPanel title="Potential Risks / Red Flags">
          <ul>{evaluation.sections.potentialRisks.map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
        <SectionPanel title="Resume Positioning Angle">{evaluation.sections.resumePositioningAngle}</SectionPanel>
        <SectionPanel title="Interview Talking Points">
          <ul>{evaluation.sections.interviewTalkingPoints.map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
        <SectionPanel title="What to verify before applying">
          <ul>{evaluation.sections.verifyBeforeApplying.map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
        <SectionPanel title="What would improve this score?">
          <ul>{evaluation.sections.improveScore.map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
        <SectionPanel title="What evidence should I add?">
          <ul>{evaluation.sections.evidenceToAdd.map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
        <SectionPanel title="Assumptions and missing information">
          <ul>{[...evaluation.assumptions, ...evaluation.missingInformation.map((item) => `Missing: ${item}`)].map((item) => <li key={item}>{item}</li>)}</ul>
        </SectionPanel>
      </section>
      <section className="feedback">
        <h2>Was this analysis accurate?</h2>
        <div className="sample-row">
          {feedbackOptions.map((option) => <Button key={option} variant="secondary" onClick={() => feedback(option)}>{option}</Button>)}
        </div>
      </section>
    </div>
  );
}
