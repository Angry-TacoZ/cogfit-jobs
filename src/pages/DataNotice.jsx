export default function DataNotice() {
  return (
    <div className="page narrow prose">
      <h1>Data Notice</h1>
      <p>CogFit Jobs stores profile answers, generated work-fit profiles, job evaluations, job ad text, and feedback so signed-in users can reuse their profile and compare future job ads.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account email and Firebase authentication identifiers.</li>
        <li>Profile intake answers and generated work-fit profile fields.</li>
        <li>Job ad text, optional notes, generated reports, and score feedback.</li>
        <li>Basic usage counters used to control cost and abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>Generate and save work-fit profiles and job-fit reports for your account.</li>
        <li>Improve scoring quality, calibration, product reliability, and abuse controls.</li>
        <li>Debug failures and verify that protected features are working.</li>
      </ul>

      <h2>How it is protected</h2>
      <ul>
        <li>Live Gemini requests run through Firebase Cloud Functions, not directly from the browser.</li>
        <li>The Gemini API key is stored server-side and is not included in frontend code.</li>
        <li>Saved profile and evaluation records are scoped to the signed-in Firebase user.</li>
        <li>App Check, authentication, request size limits, and daily usage limits reduce abuse risk.</li>
      </ul>

      <h2>Important limits</h2>
      <p>Do not paste secrets, passwords, private keys, medical records, financial account numbers, or other highly sensitive material into job ads or profile answers. This prototype is a decision-support tool and is not medical, legal, hiring, or employment advice.</p>

      <h2>Deletion requests</h2>
      <p>If you want your saved account data removed, contact the project owner with the email address used for the account. Future versions should add self-serve export and deletion controls.</p>
    </div>
  );
}
