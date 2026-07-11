<script>
  import { onMount } from 'svelte';
  import Button from '../components/Button.svelte';
  import AuthPanel from '../components/AuthPanel.svelte';
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

  let summary = null;
  let loading = true;
  let error = '';

  $: pie = buildPie(summary?.counts);
  $: total = summary?.total || 0;

  async function load() {
    loading = true;
    error = '';
    try {
      summary = await loadAdminFeedbackSummary();
    } catch (loadError) {
      error = loadError?.message || 'Admin dashboard failed to load.';
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<div class="page narrow">
  <div class="page-heading">
    <div>
      <h1>Admin dashboard</h1>
      <p>Review feedback calibration signals from saved job evaluations.</p>
    </div>
    <Button variant="secondary" on:click={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
  </div>
  <AuthPanel compact />
  {#if error}<div class="error">{error}</div>{/if}
  {#if !error}
    <section class="admin-panel">
      <div>
        <h2>Feedback ratings</h2>
        <p>{total} total feedback records captured.</p>
      </div>
      <div class="pie-layout">
        <div class="pie-chart" style={`background: conic-gradient(${pie.gradient})`} aria-label="Feedback rating pie chart"></div>
        <div class="legend-list">
          {#if pie.entries.length === 0}
            <p>No feedback has been captured yet.</p>
          {:else}
            {#each pie.entries as [label, count], index}
              <div class="legend-row">
                <span style={`background: ${colors[index % colors.length]}`}></span>
                <strong>{label}</strong>
                <em>{count} ({Math.round((count / total) * 100)}%)</em>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </section>
  {/if}
  {#if !error && summary?.recent?.length > 0}
    <section class="admin-panel">
      <h2>Recent feedback</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Rating</th>
              <th>Evaluation</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {#each summary.recent as item}
              <tr>
                <td>{item.value}</td>
                <td>{item.evaluationId || 'Unknown'}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>
