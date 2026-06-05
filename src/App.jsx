import { useEffect, useState } from 'react';
import { BriefcaseBusiness, ClipboardCheck, Home, Info, UserRound } from 'lucide-react';
import HomePage from './pages/HomePage';
import ProfileIntake from './pages/ProfileIntake';
import JobEvaluator from './pages/JobEvaluator';
import ResultsPage from './pages/ResultsPage';
import Methodology from './pages/Methodology';
import DataNotice from './pages/DataNotice';
import { loadGeneratedProfile } from './lib/storage';
import cogfitMark from './assets/cogfit-jobs-mark.png';

const routes = {
  home: HomePage,
  profile: ProfileIntake,
  evaluator: JobEvaluator,
  results: ResultsPage,
  methodology: Methodology,
  data: DataNotice
};

const nav = [
  ['home', 'Home', Home],
  ['profile', 'Profile', UserRound],
  ['evaluator', 'Evaluator', BriefcaseBusiness],
  ['results', 'Results', ClipboardCheck],
  ['methodology', 'Methodology', Info]
];

function getRoute() {
  return window.location.hash.replace('#/', '') || 'home';
}

export default function App() {
  const [route, setRoute] = useState(getRoute());
  const [profile, setProfile] = useState(loadGeneratedProfile());

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute());
      setProfile(loadGeneratedProfile());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const Page = routes[route] || HomePage;
  const go = (next) => {
    window.location.hash = `/${next}`;
    setRoute(next);
    setProfile(loadGeneratedProfile());
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => go('home')} aria-label="Go to home">
          <span className="brand-mark">
            <img src={cogfitMark} alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>CogFit Jobs</strong>
            <small>Work-fit evaluator</small>
          </span>
        </button>
        <nav className="nav">
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={route === id ? 'active' : ''} onClick={() => go(id)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main>
        <Page go={go} profile={profile} />
      </main>
      <footer className="site-footer">
        <strong>James Lane</strong>
        <span>Created 2026</span>
        <button type="button" onClick={() => go('data')}>Data Notice</button>
      </footer>
    </div>
  );
}
