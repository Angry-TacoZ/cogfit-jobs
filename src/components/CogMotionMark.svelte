<script>
  export let className = '';
  const cogTeeth = Array.from({ length: 12 }, (_, index) => index);
</script>

<div class={`motion-cog-briefcase ${className}`.trim()} aria-label="Animated CogFit Jobs cog and briefcase mark">
  <div class="motion-cog" aria-hidden="true">
    {#each cogTeeth as tooth}
      <span style={`--tooth: ${tooth}`}></span>
    {/each}
    <div class="motion-cog-inner">
      <svg class="motion-briefcase-mark" viewBox="0 0 140 104" role="img" aria-label="Briefcase mark">
        <defs>
          <linearGradient id="caseInk" x1="20" x2="112" y1="20" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#092943" />
            <stop offset="0.52" stop-color="#061d30" />
            <stop offset="1" stop-color="#021321" />
          </linearGradient>
          <linearGradient id="caseHighlight" x1="32" x2="126" y1="30" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#164765" stop-opacity="0.72" />
            <stop offset="0.42" stop-color="#0a2a43" stop-opacity="0.18" />
            <stop offset="1" stop-color="#061d30" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="case-handle-fill" d="M52 34v-9c0-7 5-12 12-12h12c7 0 12 5 12 12v9h-10v-8c0-2-2-4-4-4H66c-2 0-4 2-4 4v8z" />
        <path class="case-body" d="M23 38h94c7 0 12 5 12 12v35c0 7-5 12-12 12H23c-7 0-12-5-12-12V50c0-7 5-12 12-12z" />
        <path class="case-highlight" d="M26 43h83c6 0 10 4 10 10v31c0 3-2 6-5 7 5-13 2-27-8-36-12-10-34-14-80-12z" />
        <path class="case-lid" d="M14 53c14 11 33 18 56 18s42-7 56-18" />
        <rect class="case-clasp" x="60" y="66" width="20" height="18" rx="4" />
        <path class="case-clasp-shine" d="M65 71h10" />
      </svg>
    </div>
  </div>
</div>
