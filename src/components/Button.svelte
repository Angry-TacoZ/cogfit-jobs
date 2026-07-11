<script>
  export let variant = 'primary';
  export let className = '';
  export let type = 'button';
  export let disabled = false;
</script>

<button {type} class={`btn ${variant} ${className}`.trim()} {disabled} on:click>
  <slot />
</button>
