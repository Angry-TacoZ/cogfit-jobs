<script>
  export let label;
  export let value;
  export let tone = 'default';
</script>

<div class={`score-card ${tone}`}>
  <span>{label}</span>
  <strong>{value}</strong>
</div>
