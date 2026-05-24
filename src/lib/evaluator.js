const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const terms = {
  ai: ['ai', 'llm', 'automation', 'prompt', 'model', 'workflow', 'api'],
  build: ['build', 'prototype', 'deploy', 'integrate', 'engineer', 'tool', 'python', 'javascript'],
  systems: ['workflow', 'root cause', 'failure', 'constraints', 'process', 'systems', 'ownership'],
  platform: ['snowflake', 'kubernetes', 'terraform', 'airflow', 'dbt', 'platform', 'on-call'],
  supportSales: ['quota', 'upsell', 'call', 'calls', 'live chat', 'sales', 'conversion', 'trade shows'],
  risk: ['fast-paced', 'thrive under pressure', 'changing priorities', 'travel', 'evening', 'quota', 'on-call'],
  async: ['written', 'documentation', 'async', 'remote'],
  credentials: ['degree', 'certification', '7+', 'years', 'senior', 'regulated']
};

function countHits(text, words) {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function profileText(profile) {
  return JSON.stringify(profile || {}).toLowerCase();
}

function scoreEvidence(profile, jobText) {
  const text = profileText(profile);
  const skills = [...(profile.tools_and_skills || []), ...(profile.strongest_evidence || [])].join(' ').toLowerCase();
  const aiOverlap = countHits(jobText, terms.ai) && countHits(skills, ['ai', 'api', 'python', 'javascript', 'workflow', 'automation']);
  const buildOverlap = countHits(jobText, terms.build) && countHits(skills, ['python', 'javascript', 'react', 'firebase', 'dashboard', 'sql']);
  const platformGap = countHits(jobText, terms.platform) - countHits(skills, ['snowflake', 'kubernetes', 'terraform', 'airflow', 'dbt']);
  return clamp(48 + aiOverlap * 7 + buildOverlap * 6 + countHits(text, ['dashboard', 'assistant', 'document tooling']) * 3 - Math.max(0, platformGap) * 7);
}

function scoreCognitive(profile, jobText) {
  const text = profileText(profile);
  let score = 58;
  score += countHits(jobText, terms.systems) * 5;
  score += countHits(jobText, ['ambiguous', 'ownership', 'prototype', 'documentation']) * 5;
  score += countHits(jobText, terms.async) * 4;
  score -= countHits(jobText, terms.supportSales) * 8;
  score -= countHits(jobText, ['call targets', 'on camera', 'high-volume', 'evening events']) * 9;
  if (text.includes('ambiguous') && jobText.includes('ambiguous')) score += 8;
  if (text.includes('writing') && jobText.includes('documentation')) score += 6;
  return clamp(score);
}

function scoreCallback(profile, jobText, evidenceScore) {
  const profileSignals = profileText(profile);
  let score = 42 + evidenceScore * 0.35;
  score += countHits(jobText, ['portfolio', 'project', 'automation', 'demo']) * 4;
  score -= countHits(jobText, terms.credentials) * 7;
  if (jobText.includes('senior') && !profileSignals.includes('senior')) score -= 8;
  if (jobText.includes('kubernetes') && !profileSignals.includes('kubernetes')) score -= 10;
  if (jobText.includes('networking') || jobText.includes('customer discovery')) score += 5;
  return clamp(score);
}

function scoreRisk(profile, jobText) {
  const profileSignals = profileText(profile);
  let risk = 28 + countHits(jobText, terms.risk) * 9 + countHits(jobText, terms.supportSales) * 10;
  if (profileSignals.includes('sales') && jobText.includes('sales')) risk += 14;
  if (profileSignals.includes('call') && jobText.includes('call')) risk += 12;
  if (jobText.includes('remote')) risk -= 8;
  if (jobText.includes('documentation')) risk -= 5;
  return clamp(risk);
}

function recommendation(roleFit, cognitiveFit, risk) {
  if (roleFit >= 76 && cognitiveFit >= 74 && risk < 55) return 'Apply';
  if (roleFit >= 58 && cognitiveFit >= 55 && risk < 76) return 'Maybe';
  return 'Skip';
}

function confidence(profile, jobText) {
  const base = profile?.confidence_score || 45;
  const jobDetail = Math.min(25, jobText.length / 80);
  const missingPenalty = (profile?.missing_information?.length || 0) * 5;
  return clamp(base * 0.65 + jobDetail + 12 - missingPenalty);
}

export function mockEvaluateJob(profile, jobAd) {
  const jobText = `${jobAd.title || ''} ${jobAd.company || ''} ${jobAd.description || ''} ${jobAd.notes || ''}`.toLowerCase();
  const evidenceScore = scoreEvidence(profile, jobText);
  const cognitiveFit = scoreCognitive(profile, jobText);
  const callbackLikelihood = scoreCallback(profile, jobText, evidenceScore);
  const workstyleRisk = scoreRisk(profile, jobText);
  const systemsAvg = profile?.systems_thinking_score
    ? Object.values(profile.systems_thinking_score).reduce((sum, value) => sum + value, 0) / 6
    : 2.5;
  const systemsMatch = clamp(40 + systemsAvg * 9 + countHits(jobText, terms.systems) * 5 - countHits(jobText, terms.supportSales) * 8);
  const titleGap = countHits(jobText, terms.credentials) * 5;
  const roleFit = clamp(evidenceScore * 0.36 + cognitiveFit * 0.3 + systemsMatch * 0.22 + callbackLikelihood * 0.12 - titleGap);
  const decision = recommendation(roleFit, cognitiveFit, workstyleRisk);
  const confidenceLevel = confidence(profile, jobText);

  const missing = [];
  if (!jobAd.description || jobAd.description.length < 180) missing.push('full job description');
  if ((profile?.strongest_evidence || []).length < 3) missing.push('more concrete project evidence');
  if (callbackLikelihood < roleFit - 15) missing.push('formal title or credential alignment');
  if (workstyleRisk > 68) missing.push('confirmation of meeting, call, quota, and travel load');

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    jobTitle: jobAd.title || 'Untitled role',
    company: jobAd.company || 'Unknown company',
    overallRecommendation: decision === 'Apply'
      ? 'Apply if the listed responsibilities are real and not a support or sales wrapper.'
      : decision === 'Maybe'
        ? 'Maybe. The role has usable overlap, but verify the gaps before spending serious application energy.'
        : 'Skip unless new information proves the day-to-day work is materially different from the ad.',
    decision,
    scores: {
      roleFit,
      callbackLikelihood,
      cognitiveFit,
      workstyleRisk,
      systemsMatch,
      skillsEvidence: evidenceScore,
      confidence: confidenceLevel
    },
    sections: {
      systemsThinkingMatch: systemsMatch > 72
        ? 'Strong match. The ad rewards mapping messy workflows, diagnosing failure points, and building practical improvements.'
        : systemsMatch > 55
          ? 'Partial match. Some systems work appears present, but the ad may reward platform depth or execution more than diagnosis.'
          : 'Weak match. The ad does not show much demand for root-cause systems work.',
      skillsEvidenceMatch: evidenceScore > 74
        ? 'Your project evidence maps well to the visible tool and workflow demands.'
        : evidenceScore > 58
          ? 'There is credible overlap, but the report needs stronger proof for the hardest requirements.'
          : 'The ad asks for evidence that is not clearly present in the profile.',
      dayToDayReality: workstyleRisk > 70
        ? 'The likely day-to-day load includes frequent live interaction, pressure, or reactive work. That is a sustainability risk.'
        : cognitiveFit > 72
          ? 'The likely daily work appears to include ownership, problem mapping, building, and written explanation.'
          : 'The daily work is unclear. Verify whether the role is building and diagnosis or mostly operating a queue.',
      potentialRisks: [
        workstyleRisk > 65 ? 'High interaction, quota, travel, or chaos signals may conflict with stated work limits.' : 'No severe workstyle risk appears in the ad, but hidden meeting load should still be checked.',
        callbackLikelihood < 58 ? 'Applicant tracking screens may discount nontraditional title history.' : 'Portfolio evidence may help offset title mismatch.'
      ],
      resumePositioningAngle: 'Lead with shipped workflows, implementation evidence, and the specific problems solved. Translate nontraditional work into role verbs from the ad.',
      interviewTalkingPoints: [
        'Describe one messy workflow you mapped, what failed, and what changed after your fix.',
        'Show a concrete project artifact rather than only naming tools.',
        'Ask how much of the role is building, diagnosing, stakeholder explanation, support, and recurring meetings.'
      ],
      verifyBeforeApplying: [
        'Actual weekly meeting and live customer load',
        'Whether success is measured by shipped workflow improvements or activity volume',
        'How much autonomy the role has to change broken processes',
        'Which hard requirements are screening filters versus preferences'
      ],
      improveScore: [
        'Add quantified project outcomes and before or after evidence.',
        'Map each major job requirement to one artifact or story.',
        'Name constraints that would make the role unsustainable.'
      ],
      evidenceToAdd: [
        'Links to deployed apps, dashboards, documents, or demos',
        'Short case studies with problem, action, result, and tradeoffs',
        'Proof of collaboration mode and stakeholder communication'
      ]
    },
    missingInformation: missing,
    assumptions: [
      'Scores use visible profile and job-ad evidence only.',
      'Callback likelihood is less certain without market, recruiter, and networking context.',
      'Culture risk is inferred from job-ad language and can be wrong if the ad is poorly written.'
    ]
  };
}

export function mockAdaptiveQuestions(profile, jobAd, currentConfidence) {
  const missing = profile?.missing_information || [];
  const questions = [];
  if (missing.includes('specific project evidence')) {
    questions.push('Which 2 or 3 artifacts would you show a hiring manager first, and what did each one change?');
  }
  if (missing.includes('clear negative-fit history')) {
    questions.push('What previous role looked good on paper but became unsustainable, and what pattern caused it?');
  }
  if ((currentConfidence || profile?.confidence_score || 0) < 72) {
    questions.push(`For ${jobAd?.title || 'this role'}, which requirement feels most real and which one feels like title inflation?`);
  }
  return questions.slice(0, 3);
}

export function evaluationToMarkdown(evaluation) {
  if (!evaluation) return '';
  const scoreLines = Object.entries(evaluation.scores)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
  return `# CogFit Jobs Report: ${evaluation.jobTitle} at ${evaluation.company}

## Recommendation
${evaluation.overallRecommendation}

Decision: ${evaluation.decision}

## Scores
${scoreLines}

## Systems-Thinking Match
${evaluation.sections.systemsThinkingMatch}

## Skills and Evidence Match
${evaluation.sections.skillsEvidenceMatch}

## Day-to-Day Reality
${evaluation.sections.dayToDayReality}

## Potential Risks
${evaluation.sections.potentialRisks.map((item) => `- ${item}`).join('\n')}

## Resume Positioning Angle
${evaluation.sections.resumePositioningAngle}

## Interview Talking Points
${evaluation.sections.interviewTalkingPoints.map((item) => `- ${item}`).join('\n')}

## What to Verify Before Applying
${evaluation.sections.verifyBeforeApplying.map((item) => `- ${item}`).join('\n')}

## Missing Information
${evaluation.missingInformation.map((item) => `- ${item}`).join('\n') || '- None identified'}

## Assumptions
${evaluation.assumptions.map((item) => `- ${item}`).join('\n')}
`;
}
