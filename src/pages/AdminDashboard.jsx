import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import AuthPanel from '../components/AuthPanel';
import { loadAdminFeedbackSummary } from '../lib/firebaseClient';

const colors = ['#146c66', '#4464ad', '#d28445', '#a14111', '#6b5b95', '#2f855a'];

function buildPie(counts) {
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (!total) {
    return { entries: [], gradient: '#e7edf3 0 100%' };
  }

  let cursor = 0;
  const stops = entries.map(([, count], index) => {
    const start = cursor;
    const size = (count / total) * 100;
    cursor += size;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return { entries, gradient: stops.join(', ') };
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await loadAdminFeedbackSummary());
    } catch (loadError) {
      setError(loadError?.message || 'Admin dashboard failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pie = useMemo(() => buildPie(summary?.counts), [summary]);
  const total = summary?.total || 0;

  return (
    <div className="page narrow">
      <div className="page-heading">
        <div>
          <h1>Admin dashboard</h1>
          <p>Review feedback calibration signals from saved job evaluations.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>
      <AuthPanel compact />
      {error && <div className="error">{error}</div>}
      {!error && (
        <section className="admin-panel">
          <div>
            <h2>Feedback ratings</h2>
            <p>{total} total feedback records captured.</p>
          </div>
          <div className="pie-layout">
            <div className="pie-chart" style={{ background: `conic-gradient(${pie.gradient})` }} aria-label="Feedback rating pie chart" />
            <div className="legend-list">
              {pie.entries.length === 0 ? (
                <p>No feedback has been captured yet.</p>
              ) : pie.entries.map(([label, count], index) => (
                <div className="legend-row" key={label}>
                  <span style={{ background: colors[index % colors.length] }} />
                  <strong>{label}</strong>
                  <em>{count} ({Math.round((count / total) * 100)}%)</em>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {!error && summary?.recent?.length > 0 && (
        <section className="admin-panel">
          <h2>Recent feedback</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Evaluation</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((item) => (
                  <tr key={`${item.id}-${item.path}`}>
                    <td>{item.value}</td>
                    <td>{item.evaluationId || 'Unknown'}</td>
                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
