export const sampleEvaluations = {
  'fde-ai-enablement': {
    id: 'sample-fde-ai-enablement',
    createdAt: '2026-01-01T00:00:00.000Z',
    jobTitle: 'AI Enablement / Forward Deployed AI Engineer',
    company: 'Northstar Workflow Labs',
    overallRecommendation: 'Apply. This sample role rewards workflow mapping, practical AI implementation, written explanation, and ownership of ambiguous operator problems.',
    decision: 'Apply',
    scores: {
      roleFit: 91,
      callbackLikelihood: 76,
      cognitiveFit: 94,
      workstyleRisk: 28,
      systemsMatch: 93,
      skillsEvidence: 88,
      confidence: 82
    },
    sections: {
      systemsThinkingMatch: 'Strong match. The role asks for workflow mapping, failure-mode evaluation, practical automation, and cross-functional explanation.',
      skillsEvidenceMatch: 'Strong match. The sample profile has AI workflow builds, API integration, Python tooling, dashboards, and deployed assistant evidence.',
      dayToDayReality: 'The likely daily work is discovery, prototyping, documentation, stakeholder explanation, and iteration with operators.',
      potentialRisks: [
        'Verify that customer discovery is not mostly live support or sales engineering theater.',
        'Ask how much authority the role has to change broken workflows after diagnosing them.'
      ],
      resumePositioningAngle: 'Lead with shipped AI workflows, API integrations, and cases where messy operations were turned into usable tools.',
      interviewTalkingPoints: [
        'Walk through one workflow you mapped from failure pattern to deployed fix.',
        'Show a concrete automation or assistant artifact.',
        'Explain how you decide when an AI workflow is useful enough to ship.'
      ],
      verifyBeforeApplying: [
        'Actual travel and live meeting load',
        'Whether the role owns implementation or only advises',
        'How success is measured after deployment'
      ],
      improveScore: [
        'Add quantified outcomes from deployed workflows.',
        'Add one concise case study with problem, build, result, and tradeoffs.'
      ],
      evidenceToAdd: [
        'Live app links or screenshots',
        'Workflow diagrams',
        'Before and after metrics'
      ]
    },
    missingInformation: ['quantified business impact', 'exact customer interaction load'],
    assumptions: ['This is a static sample report for product demonstration. It is not generated from your account data.']
  },
  'data-platform-heavy': {
    id: 'sample-data-platform-heavy',
    createdAt: '2026-01-01T00:00:00.000Z',
    jobTitle: 'Senior Data Platform Engineer',
    company: 'VectorSpan Analytics',
    overallRecommendation: 'Maybe. There is systems and data overlap, but the platform depth, seniority screen, Kubernetes, and on-call expectations create real risk.',
    decision: 'Maybe',
    scores: {
      roleFit: 58,
      callbackLikelihood: 42,
      cognitiveFit: 62,
      workstyleRisk: 61,
      systemsMatch: 70,
      skillsEvidence: 55,
      confidence: 76
    },
    sections: {
      systemsThinkingMatch: 'Partial match. The profile shows systems thinking, but this role emphasizes production data platform ownership and infrastructure operations.',
      skillsEvidenceMatch: 'Mixed. SQL and dashboard evidence help, but Snowflake, Kubernetes, Terraform, Airflow, and regulated platform operations are not strongly evidenced.',
      dayToDayReality: 'The likely daily work includes platform reliability, incident response, infrastructure coordination, and on-call work.',
      potentialRisks: [
        'Formal senior platform requirements may screen out nontraditional evidence.',
        'On-call and infrastructure depth may be a sustainability or credibility gap.'
      ],
      resumePositioningAngle: 'Position around workflow systems, SQL, dashboarding, and automation, but do not overstate platform operations experience.',
      interviewTalkingPoints: [
        'Clarify which requirements are hard filters.',
        'Discuss systems debugging experience without pretending to be a Kubernetes specialist.',
        'Ask how much work is platform operations versus workflow improvement.'
      ],
      verifyBeforeApplying: [
        'Whether Kubernetes and Terraform are hard requirements',
        'On-call frequency',
        'Mentoring and seniority expectations'
      ],
      improveScore: [
        'Add production data platform examples.',
        'Add cloud infrastructure or orchestration evidence if real.'
      ],
      evidenceToAdd: [
        'SQL project details',
        'Dashboard architecture',
        'Any reliability or pipeline work'
      ]
    },
    missingInformation: ['production infrastructure evidence', 'years requirement flexibility'],
    assumptions: ['This is a static sample report for product demonstration. It is not generated from your account data.']
  },
  'support-sales-ai-specialist': {
    id: 'sample-support-sales-ai-specialist',
    createdAt: '2026-01-01T00:00:00.000Z',
    jobTitle: 'AI Customer Support and Sales Specialist',
    company: 'PromptReach Growth',
    overallRecommendation: 'Skip. The title includes AI, but the day-to-day work appears to be high-volume support, sales conversion, live calls, and event pressure.',
    decision: 'Skip',
    scores: {
      roleFit: 32,
      callbackLikelihood: 64,
      cognitiveFit: 18,
      workstyleRisk: 92,
      systemsMatch: 20,
      skillsEvidence: 41,
      confidence: 86
    },
    sections: {
      systemsThinkingMatch: 'Weak match. The role rewards live customer handling and sales conversion more than root-cause workflow improvement.',
      skillsEvidenceMatch: 'Low practical fit. AI familiarity may help demos, but the role is not primarily building or diagnosing systems.',
      dayToDayReality: 'The likely daily work is calls, live chat, upsells, on-camera demos, travel, quotas, and pressure.',
      potentialRisks: [
        'High-volume customer contact conflicts with the sample profile interaction limits.',
        'Quota and sales pressure are explicit negative-fit signals.'
      ],
      resumePositioningAngle: 'If applying anyway, position around technical demos and workflow understanding, but the mismatch is structural.',
      interviewTalkingPoints: [
        'Ask how much time is support queue work.',
        'Ask whether success is quota-based.',
        'Clarify whether there is any ownership of product or workflow improvements.'
      ],
      verifyBeforeApplying: [
        'Daily call volume',
        'Weekly conversion targets',
        'Travel and evening event frequency'
      ],
      improveScore: [
        'The score would improve only if the role is actually implementation-focused, not support and sales-heavy.'
      ],
      evidenceToAdd: [
        'Customer-facing demo examples only if the interaction load is sustainable.'
      ]
    },
    missingInformation: ['actual support queue volume'],
    assumptions: ['This is a static sample report for product demonstration. It is not generated from your account data.']
  }
};
