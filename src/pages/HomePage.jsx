import { ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import CogMotionMark from '../components/CogMotionMark';
import { sampleJobs } from '../data/sampleJobs';
import { sampleProfile } from '../data/sampleProfiles';
import { saveGeneratedProfile } from '../lib/storage';

export default function HomePage({ go }) {
  const runSample = () => {
    saveGeneratedProfile(sampleProfile);
    sessionStorage.setItem('cogfit.pendingJob', JSON.stringify(sampleJobs[0]));
    sessionStorage.setItem('cogfit.pendingSampleId', sampleJobs[0].id);
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
        <div className="hero-motion-mark">
          <CogMotionMark className="home-motion-mark" />
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
            <p>Save your work-fit profile to your account and run another job ad without rebuilding everything.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
