import { ArrowRight, FileText, SearchCheck } from 'lucide-react';
import Button from '../components/Button';
import { sampleJobs } from '../data/sampleJobs';
import { sampleProfile } from '../data/sampleProfiles';
import { saveGeneratedProfile } from '../lib/storage';

export default function HomePage({ go }) {
  const runSample = () => {
    saveGeneratedProfile(sampleProfile);
    sessionStorage.setItem('cogfit.pendingJob', JSON.stringify(sampleJobs[0]));
    go('evaluator');
  };

  return (
    <div className="home-grid">
      <section className="hero">
        <div>
          <h1>CogFit Jobs</h1>
          <p className="subhead">
            CogFit Jobs compares a job ad against how you actually work, what drains you, what you have built, and what evidence you can show.
          </p>
          <div className="hero-actions">
            <Button onClick={() => go('profile')}>Build my work-fit profile <ArrowRight size={18} /></Button>
            <Button variant="secondary" onClick={runSample}>Try sample job ad</Button>
          </div>
        </div>
        <div className="hero-panel" aria-label="Prototype workflow preview">
          <div className="mini-row">
            <FileText />
            <span>Profile evidence</span>
            <strong>88%</strong>
          </div>
          <div className="mini-row">
            <SearchCheck />
            <span>AI Enablement role</span>
            <strong>Apply</strong>
          </div>
          <div className="bars">
            <span style={{ width: '86%' }} />
            <span style={{ width: '78%' }} />
            <span style={{ width: '31%' }} />
          </div>
          <p>
            Not a keyword scanner. The evaluator separates ability, callback probability, cognitive load, and workstyle risk.
          </p>
        </div>
      </section>
      <section className="band">
        <h2>Built for candidates whose evidence is real but unevenly named.</h2>
        <div className="feature-grid">
          <article>
            <h3>Profile first</h3>
            <p>Start with 24 focused questions about work patterns, evidence, constraints, and bad-fit history.</p>
          </article>
          <article>
            <h3>Realistic scoring</h3>
            <p>Role fit, callback likelihood, cognitive fit, and culture risk are scored separately.</p>
          </article>
          <article>
            <h3>Reusable profile</h3>
            <p>Save your work-fit profile locally and run another job ad without rebuilding everything.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
