export function generateAdaptiveQuestions(profile, jobAd, currentConfidence) {
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
