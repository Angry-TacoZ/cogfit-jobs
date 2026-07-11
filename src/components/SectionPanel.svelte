<script>
  export let title;
  export let defaultOpen = false;
</script>

<details class="section-panel" open={defaultOpen}>
  <summary>{title}</summary>
  <div><slot /></div>
</details>
