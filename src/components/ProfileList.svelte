<script>
  export let title;
  export let items = [];

  $: values = (Array.isArray(items) ? items : [items]).filter(Boolean);
</script>

{#if values.length}
  <section class="profile-card">
    <h3>{title}</h3>
    <div class="chip-list">
      {#each values as item}
        <span>{item}</span>
      {/each}
    </div>
  </section>
{/if}
