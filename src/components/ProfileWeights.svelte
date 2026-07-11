<script>
  export let profile;

  const includesAny = (value, terms) => terms.some((term) => String(value || '').toLowerCase().includes(term));
  const asText = (value) => Array.isArray(value) ? value.join(' ') : String(value || '');
  const clamp = (value) => Math.min(100, Math.max(0, value));

  function buildWorkProfileWeights(nextProfile) {
    const energizers = asText(nextProfile?.energizers);
    const drainers = asText(nextProfile?.drainers);
    const structure = `${nextProfile?.preferred_problem_structure || ''} ${nextProfile?.autonomy_needs || ''}`;
    const communication = `${asText(nextProfile?.communication_preferences)} ${nextProfile?.interaction_limits || ''}`;
    const evidence = `${asText(nextProfile?.strongest_evidence)} ${asText(nextProfile?.tools_and_skills)} ${asText(nextProfile?.negative_fit_patterns)}`;
    const flags = nextProfile?.inferred_flags || {};

    return [
      {
        label: 'Problem shape',
        left: 'Clear tasks',
        right: 'Ambiguous ownership',
        value: clamp(48 + (flags.likes_ambiguity ? 22 : 0) + (includesAny(structure, ['ambiguous', 'ownership', 'messy', 'unclear']) ? 16 : 0) - (includesAny(structure, ['clear task', 'defined']) ? 12 : 0))
      },
      {
        label: 'Primary work mode',
        left: 'Repeat process',
        right: 'Build and redesign',
        value: clamp(45 + (includesAny(energizers, ['build', 'create', 'prototype', 'automate']) ? 18 : 0) + (includesAny(evidence, ['app', 'automation', 'api', 'workflow', 'tool']) ? 15 : 0) - (includesAny(drainers, ['repetitive', 'volume', 'support queue']) ? 6 : 0))
      },
      {
        label: 'Communication load',
        left: 'Live interaction',
        right: 'Async writing',
        value: clamp(44 + (flags.prefers_async ? 20 : 0) + (includesAny(communication, ['writing', 'async', 'documentation', 'demo']) ? 16 : 0) - (includesAny(communication, ['phone', 'camera', 'live customer']) ? 12 : 0))
      },
      {
        label: 'Autonomy need',
        left: 'Managed structure',
        right: 'Independent ownership',
        value: clamp(46 + (includesAny(structure, ['ownership', 'autonomy', 'act', 'decide']) ? 22 : 0) + (includesAny(energizers, ['ownership', 'problem', 'system']) ? 10 : 0) - (includesAny(drainers, ['micromanage', 'approval', 'trapped']) ? 8 : 0))
      },
      {
        label: 'System preference',
        left: 'Operate stable system',
        right: 'Improve broken system',
        value: clamp(44 + (includesAny(evidence, ['improve', 'fix', 'redesign', 'workflow', 'system', 'dashboard']) ? 18 : 0) + (includesAny(energizers, ['broken', 'system', 'diagnose']) ? 14 : 0))
      },
      {
        label: 'Role center',
        left: 'Sales or support load',
        right: 'Technical creation',
        value: clamp(50 + (includesAny(evidence, ['python', 'javascript', 'react', 'firebase', 'sql', 'api', 'power bi']) ? 18 : 0) + (flags.avoids_sales_pressure ? 12 : 0) + (includesAny(drainers, ['sales', 'quota', 'call volume']) ? 8 : 0))
      }
    ];
  }

  $: weights = buildWorkProfileWeights(profile);
</script>

<section class="profile-panel">
  <div class="profile-panel-heading">
    <div>
      <h2>Work profile weights</h2>
      <p>These ranges show the evaluator's current read of your sustainable work style.</p>
    </div>
    <strong>{profile?.confidence_score || 0}/100 confidence</strong>
  </div>
  <div class="weight-list">
    {#each weights as weight}
      <div class="weight-row">
        <div class="weight-title">
          <strong>{weight.label}</strong>
          <span>{weight.value}/100</span>
        </div>
        <div class="weight-track" aria-label={`${weight.label}: ${weight.value} out of 100`}>
          <span class="weight-end left">{weight.left}</span>
          <span class="weight-end right">{weight.right}</span>
          <span class="weight-line"></span>
          <span class="weight-marker" style={`left: ${weight.value}%`}></span>
        </div>
      </div>
    {/each}
  </div>
</section>
