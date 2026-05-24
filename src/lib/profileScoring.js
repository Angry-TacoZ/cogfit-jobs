const sections = [
  {
    title: 'Current target roles',
    questions: [
      ['q1', 'What role families are you currently targeting?'],
      ['q2', 'What role titles keep showing up that seem close but not exact?'],
      ['q3', 'What salary, location, remote, hybrid, travel, or schedule constraints matter?']
    ]
  },
  {
    title: 'Work history and strongest evidence',
    questions: [
      ['q4', 'What work have you done that proves your ability better than your titles do?'],
      ['q5', 'What projects, apps, automations, writing, dashboards, tools, or portfolios can you point to?'],
      ['q6', 'What tools, platforms, languages, or systems have you actually used?'],
      ['q7', 'What do people keep misunderstanding about your resume?']
    ]
  },
  {
    title: 'Energy and cognitive fit',
    questions: [
      ['q8', 'What kind of work makes time disappear for you?'],
      ['q9', 'What kind of work makes you feel trapped or depleted?'],
      ['q10', 'What does a good day at work actually look like?'],
      ['q11', 'What does a bad day at work actually look like?'],
      ['q12', 'What hidden cost do employers usually miss about you?']
    ]
  },
  {
    title: 'Problem structure and autonomy',
    questions: [
      ['q13', 'Do you prefer clear tasks, ambiguous problems with ownership, or a mix?'],
      ['q14', 'How much structure do you need before you can act?'],
      ['q15', 'Do you like improving broken systems, operating stable systems, or creating new systems?'],
      ['q16', 'When something breaks, what do you naturally inspect first?']
    ]
  },
  {
    title: 'Communication and interaction load',
    questions: [
      ['q17', 'How much phone, camera, live customer, or meeting interaction can you sustain?'],
      ['q18', 'Do you communicate better in writing, live conversation, demos, documentation, or presentations?'],
      ['q19', 'What kind of people interaction energizes you?'],
      ['q20', 'What kind of people interaction drains you?']
    ]
  },
  {
    title: 'Negative-fit history',
    questions: [
      ['q21', 'What jobs or roles have gone badly, and what specifically caused the mismatch?'],
      ['q22', 'What responsibilities can you technically do but should not do all day?']
    ]
  },
  {
    title: 'Work preferences and role verbs',
    questions: [
      ['q23', 'Rank these from strongest to weakest: building, analyzing, explaining, managing, selling, operating, supporting.'],
      ['q24', 'What would make you accept or reject a role even if the title looked right?']
    ]
  }
];

export const profileSections = sections;
export const questionCount = sections.flatMap((section) => section.questions).length;

const splitList = (value) =>
  String(value || '')
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

const containsAny = (text, words) => words.some((word) => text.includes(word));

function scoreSystemsThinking(answers) {
  const text = Object.values(answers).join(' ').toLowerCase();
  const dimensions = {
    root_cause_depth: ['root cause', 'why', 'cause', 'diagnose', 'inspect', 'incentive'],
    system_mapping: ['workflow', 'system', 'handoff', 'constraint', 'ownership', 'downstream'],
    pattern_recognition: ['pattern', 'repeated', 'usually', 'keeps', 'signals', 'trend'],
    failure_mode_awareness: ['breaks', 'failure', 'risk', 'miss', 'edge', 'bottleneck'],
    improvement_drive: ['improve', 'fix', 'redesign', 'automate', 'build', 'clarify'],
    abstraction_ability: ['model', 'map', 'structure', 'framework', 'tradeoff', 'principle']
  };

  return Object.fromEntries(
    Object.entries(dimensions).map(([key, words]) => {
      const hits = words.filter((word) => text.includes(word)).length;
      return [key, Math.min(5, Math.max(1, hits + (text.length > 900 ? 1 : 0)))];
    })
  );
}

export function generateWorkFitProfile(answers) {
  const answered = Object.values(answers).filter((value) => String(value || '').trim().length > 12).length;
  const totalLength = Object.values(answers).join(' ').length;
  const confidence = Math.min(94, Math.round((answered / questionCount) * 70 + Math.min(24, totalLength / 180)));
  const text = Object.values(answers).join(' ').toLowerCase();
  const systemsScore = scoreSystemsThinking(answers);

  const missing = [];
  if (!answers.q5 || answers.q5.length < 40) missing.push('specific project evidence');
  if (!answers.q3 || answers.q3.length < 25) missing.push('salary, location, schedule, or travel constraints');
  if (!answers.q21 || answers.q21.length < 30) missing.push('clear negative-fit history');
  if (!answers.q6 || answers.q6.length < 30) missing.push('tools and skills evidence');

  return {
    target_role_families: splitList(answers.q1),
    strongest_evidence: splitList(`${answers.q4 || ''}; ${answers.q5 || ''}`),
    tools_and_skills: splitList(answers.q6),
    energizers: splitList(answers.q8),
    drainers: splitList(`${answers.q9 || ''}; ${answers.q11 || ''}`),
    preferred_problem_structure: answers.q13 || 'Not enough evidence yet.',
    communication_preferences: splitList(answers.q18),
    interaction_limits: answers.q17 || 'Not enough evidence yet.',
    autonomy_needs: answers.q14 || 'Not enough evidence yet.',
    negative_fit_patterns: splitList(`${answers.q21 || ''}; ${answers.q22 || ''}`),
    hidden_costs: splitList(answers.q12),
    misunderstood_resume_signals: splitList(answers.q7),
    systems_thinking_score: systemsScore,
    confidence_score: confidence,
    missing_information: missing,
    inferred_flags: {
      likes_ambiguity: containsAny(text, ['ambiguous', 'ownership', 'messy', 'unclear']),
      avoids_sales_pressure: containsAny(text, ['sales', 'quota', 'upsell']),
      prefers_async: containsAny(text, ['writing', 'async', 'documentation']),
      low_call_tolerance: containsAny(text, ['phone', 'call', 'camera', 'meeting'])
    }
  };
}

export function needsAdaptiveQuestions(profile) {
  return profile.confidence_score < 72 || profile.missing_information.length > 1;
}
