const cogTeeth = Array.from({ length: 12 }, (_, index) => index);

export default function CogMotionMark({ className = '' }) {
  return (
    <div className={`motion-cog-briefcase ${className}`.trim()} aria-label="Animated CogFit Jobs cog and briefcase mark">
      <div className="motion-cog" aria-hidden="true">
        {cogTeeth.map((tooth) => (
          <span key={tooth} style={{ '--tooth': tooth }} />
        ))}
        <div className="motion-cog-inner">
          <svg className="motion-briefcase-mark" viewBox="0 0 140 104" role="img" aria-label="Briefcase mark">
            <defs>
              <linearGradient id="caseInk" x1="20" x2="112" y1="20" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#092943" />
                <stop offset="0.52" stopColor="#061d30" />
                <stop offset="1" stopColor="#021321" />
              </linearGradient>
              <linearGradient id="caseHighlight" x1="32" x2="126" y1="30" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#164765" stopOpacity="0.72" />
                <stop offset="0.42" stopColor="#0a2a43" stopOpacity="0.18" />
                <stop offset="1" stopColor="#061d30" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="case-handle-fill" d="M52 34v-9c0-7 5-12 12-12h12c7 0 12 5 12 12v9h-10v-8c0-2-2-4-4-4H66c-2 0-4 2-4 4v8z" />
            <path className="case-body" d="M23 38h94c7 0 12 5 12 12v35c0 7-5 12-12 12H23c-7 0-12-5-12-12V50c0-7 5-12 12-12z" />
            <path className="case-highlight" d="M26 43h83c6 0 10 4 10 10v31c0 3-2 6-5 7 5-13 2-27-8-36-12-10-34-14-80-12z" />
            <path className="case-lid" d="M14 53c14 11 33 18 56 18s42-7 56-18" />
            <rect className="case-clasp" x="60" y="66" width="20" height="18" rx="4" />
            <path className="case-clasp-shine" d="M65 71h10" />
          </svg>
        </div>
      </div>
    </div>
  );
}
