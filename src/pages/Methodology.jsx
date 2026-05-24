export default function Methodology() {
  return (
    <div className="page narrow prose">
      <h1>Methodology</h1>
      <p>CogFit Jobs evaluates jobs using a work-fit profile, project evidence, cognitive load and sustainability signals, callback probability, day-to-day role realism, culture and workstyle risk, and calibration feedback.</p>
      <h2>How the prototype scores a role</h2>
      <ol>
        <li><strong>Work-fit profile:</strong> target roles, constraints, energizers, drainers, communication mode, autonomy needs, and negative-fit history.</li>
        <li><strong>Project evidence:</strong> artifacts, tools, systems, and shipped work that may matter more than legacy titles.</li>
        <li><strong>Cognitive load:</strong> ambiguity, repetition, customer contact, meeting load, ownership, communication mode, and build versus operate balance.</li>
        <li><strong>Callback probability:</strong> formal title match, years, credentials, ATS language, portfolio strength, and likely screen risk.</li>
        <li><strong>Day-to-day realism:</strong> what the work probably feels like after the title and brand are stripped away.</li>
        <li><strong>Culture and workstyle risk:</strong> micromanagement, quota pressure, call-center patterns, vague chaos, travel, unclear ownership, and institutional friction.</li>
        <li><strong>Calibration feedback:</strong> local feedback captures whether the result felt accurate, too optimistic, too pessimistic, or missed a constraint.</li>
      </ol>
      <h2>Systems-thinking detector</h2>
      <p>The prototype scores systems thinking from answer structure, not self-labels. It looks for root causes, downstream effects, incentives, workflows, constraints, failure modes, repeated patterns, and process redesign.</p>
      <h2>Limits</h2>
      <p>This is not medical, legal, or hiring advice. It does not guarantee employment outcomes. It is a decision-support tool designed to help users decide where to spend application and networking energy.</p>
    </div>
  );
}
