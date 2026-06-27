import { useEffect, useState } from 'react';
import Button from '../components/Button';
import ScoreCard from '../components/ScoreCard';
import SectionPanel from '../components/SectionPanel';
import { evaluationToMarkdown } from '../lib/evaluator';
import { loadGeneratedProfile, loadEvaluations, mergeEvaluations, saveEvaluations, saveFeedback } from '../lib/storage';
import { loadCloudEvaluations, saveCloudFeedback, watchAuth } from '../lib/firebaseClient';

const feedbackOptions = ['accurate', 'too optimistic', 'too pessimistic', 'missed key constraint', 'misunderstood my experience'];

function listItems(items = []) {
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default function ResultsPage({ go }) {
  const [evaluations, setEvaluations] = useState(loadEvaluations());
  const [selectedId, setSelectedId] = useState(evaluations[0]?.id);
  const [copied, setCopied] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');
  const profile = loadGeneratedProfile();
  const evaluation = evaluations.find((item) => item.id === selectedId) || evaluations[0];

  useEffect(() => {
    let stopped = false;
    let unsubscribe;

    watchAuth((user) => {
      if (!user) return;
      loadCloudEvaluations()
        .then((cloudEvaluations) => {
          if (stopped || cloudEvaluations.length === 0) return;
          setEvaluations((current) => {
            const merged = mergeEvaluations(cloudEvaluations, current);
            saveEvaluations(merged);
            setSelectedId((currentId) => currentId || merged[0]?.id);
            return merged;
          });
        })
        .catch(() => {
          if (!stopped) {
            setHistoryStatus('Saved evaluation history could not be refreshed. Local results are still available.');
          }
        });
    }).then((unwatch) => {
      unsubscribe = unwatch;
    }).catch(() => {
      if (!stopped) {
        setHistoryStatus('Saved evaluation history could not be refreshed. Local results are still available.');
      }
    });

    return () => {
      stopped = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
  const feedback = async (value) => {
    saveFeedback(evaluation.id, value);
    if (profile?.profile_id && evaluation?.id) {
      try {
        await saveCloudFeedback(profile.profile_id, evaluation.id, value);
      } catch {
        setCopied('Feedback saved locally. Cloud feedback sync failed.');
        return;
      }
    }
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
      <div className="results-toolbar">
        {evaluations.length > 1 && (
          <label className="field inline-select">
            <span>Past evaluations</span>
            <select value={evaluation.id} onChange={(event) => setSelectedId(event.target.value)}>
              {evaluations.map((item) => <option key={item.id} value={item.id}>{item.jobTitle} at {item.company}</option>)}
            </select>
          </label>
        )}
      </div>
      {historyStatus && <div className="error">{historyStatus}</div>}
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
        <SectionPanel title={`Why Role Fit is ${evaluation.scores.roleFit}`} defaultOpen>
          <p>{evaluation.sections.skillsEvidenceMatch}</p>
          <p>{evaluation.sections.resumePositioningAngle}</p>
        </SectionPanel>
        <SectionPanel title={`Why Callback Likelihood is ${evaluation.scores.callbackLikelihood}`} defaultOpen>
          <p>{evaluation.sections.resumePositioningAngle}</p>
          <h3>What could improve the screen</h3>
          {listItems(evaluation.sections.evidenceToAdd)}
        </SectionPanel>
        <SectionPanel title={`Why Cognitive Fit is ${evaluation.scores.cognitiveFit}`} defaultOpen>
          <p>{evaluation.sections.dayToDayReality}</p>
        </SectionPanel>
        <SectionPanel title={`Why Workstyle Risk is ${evaluation.scores.workstyleRisk}`} defaultOpen>
          {listItems(evaluation.sections.potentialRisks)}
        </SectionPanel>
        <SectionPanel title={`Why Systems Match is ${evaluation.scores.systemsMatch}`}>
          <p>{evaluation.sections.systemsThinkingMatch}</p>
        </SectionPanel>
        <SectionPanel title={`Why Skills Evidence is ${evaluation.scores.skillsEvidence}`}>
          <p>{evaluation.sections.skillsEvidenceMatch}</p>
          {listItems(evaluation.sections.evidenceToAdd)}
        </SectionPanel>
        <SectionPanel title={`Why Confidence is ${evaluation.scores.confidence}`}>
          {listItems([...evaluation.assumptions, ...evaluation.missingInformation.map((item) => `Missing: ${item}`)])}
        </SectionPanel>
        <SectionPanel title="Interview Talking Points">
          {listItems(evaluation.sections.interviewTalkingPoints)}
        </SectionPanel>
        <SectionPanel title="What to verify before applying">
          {listItems(evaluation.sections.verifyBeforeApplying)}
        </SectionPanel>
        <SectionPanel title="What would improve this score?">
          {listItems(evaluation.sections.improveScore)}
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
