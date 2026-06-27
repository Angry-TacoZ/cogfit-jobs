class PayloadValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PayloadValidationError';
  }
}

const MAX_DESCRIPTION_CHARS = 12000;
const MAX_PROFILE_CHARS = 16000;
const MAX_NOTES_CHARS = 1000;
const MAX_PROFILE_ANSWERS_CHARS = 18000;
const MAX_ID_CHARS = 128;
const feedbackValues = new Set([
  'accurate',
  'too optimistic',
  'too pessimistic',
  'missed key constraint',
  'misunderstood my experience'
]);

const systemsThinkingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'root_cause_depth',
    'system_mapping',
    'pattern_recognition',
    'failure_mode_awareness',
    'improvement_drive',
    'abstraction_ability'
  ],
  properties: {
    root_cause_depth: { type: 'integer', minimum: 0, maximum: 5 },
    system_mapping: { type: 'integer', minimum: 0, maximum: 5 },
    pattern_recognition: { type: 'integer', minimum: 0, maximum: 5 },
    failure_mode_awareness: { type: 'integer', minimum: 0, maximum: 5 },
    improvement_drive: { type: 'integer', minimum: 0, maximum: 5 },
    abstraction_ability: { type: 'integer', minimum: 0, maximum: 5 }
  }
};

const workFitProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target_role_families',
    'strongest_evidence',
    'tools_and_skills',
    'energizers',
    'drainers',
    'preferred_problem_structure',
    'communication_preferences',
    'interaction_limits',
    'autonomy_needs',
    'negative_fit_patterns',
    'hidden_costs',
    'misunderstood_resume_signals',
    'systems_thinking_score',
    'confidence_score',
    'missing_information'
  ],
  properties: {
    target_role_families: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    strongest_evidence: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    tools_and_skills: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    energizers: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    drainers: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    preferred_problem_structure: { type: 'string' },
    communication_preferences: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    interaction_limits: { type: 'string' },
    autonomy_needs: { type: 'string' },
    negative_fit_patterns: { type: 'array', items: { type: 'string' }, maxItems: 10 },
    hidden_costs: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    misunderstood_resume_signals: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    systems_thinking_score: systemsThinkingSchema,
    confidence_score: { type: 'integer', minimum: 0, maximum: 100 },
    missing_information: { type: 'array', items: { type: 'string' }, maxItems: 10 }
  }
};

const reportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallRecommendation',
    'decision',
    'scores',
    'sections',
    'missingInformation',
    'assumptions'
  ],
  properties: {
    overallRecommendation: { type: 'string' },
    decision: { type: 'string', enum: ['Apply', 'Maybe', 'Skip'] },
    scores: {
      type: 'object',
      additionalProperties: false,
      required: [
        'roleFit',
        'callbackLikelihood',
        'cognitiveFit',
        'workstyleRisk',
        'systemsMatch',
        'skillsEvidence',
        'confidence'
      ],
      properties: {
        roleFit: { type: 'integer', minimum: 0, maximum: 100 },
        callbackLikelihood: { type: 'integer', minimum: 0, maximum: 100 },
        cognitiveFit: { type: 'integer', minimum: 0, maximum: 100 },
        workstyleRisk: { type: 'integer', minimum: 0, maximum: 100 },
        systemsMatch: { type: 'integer', minimum: 0, maximum: 100 },
        skillsEvidence: { type: 'integer', minimum: 0, maximum: 100 },
        confidence: { type: 'integer', minimum: 0, maximum: 100 }
      }
    },
    sections: {
      type: 'object',
      additionalProperties: false,
      required: [
        'systemsThinkingMatch',
        'skillsEvidenceMatch',
        'dayToDayReality',
        'potentialRisks',
        'resumePositioningAngle',
        'interviewTalkingPoints',
        'verifyBeforeApplying',
        'improveScore',
        'evidenceToAdd'
      ],
      properties: {
        systemsThinkingMatch: { type: 'string' },
        skillsEvidenceMatch: { type: 'string' },
        dayToDayReality: { type: 'string' },
        potentialRisks: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        resumePositioningAngle: { type: 'string' },
        interviewTalkingPoints: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        verifyBeforeApplying: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        improveScore: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        evidenceToAdd: { type: 'array', items: { type: 'string' }, maxItems: 6 }
      }
    },
    missingInformation: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 8 }
  }
};

const profileArrayFields = {
  target_role_families: 8,
  strongest_evidence: 10,
  tools_and_skills: 20,
  energizers: 10,
  drainers: 10,
  communication_preferences: 8,
  negative_fit_patterns: 10,
  hidden_costs: 8,
  misunderstood_resume_signals: 8,
  missing_information: 10
};

const profileStringFields = [
  'preferred_problem_structure',
  'interaction_limits',
  'autonomy_needs'
];

const sectionArrayFields = {
  potentialRisks: 6,
  interviewTalkingPoints: 6,
  verifyBeforeApplying: 6,
  improveScore: 6,
  evidenceToAdd: 6
};

const sectionStringFields = [
  'systemsThinkingMatch',
  'skillsEvidenceMatch',
  'dayToDayReality',
  'resumePositioningAngle'
];

const scoreFields = [
  'roleFit',
  'callbackLikelihood',
  'cognitiveFit',
  'workstyleRisk',
  'systemsMatch',
  'skillsEvidence',
  'confidence'
];

function fail(message) {
  throw new PayloadValidationError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requirePlainObject(value, field) {
  if (!isPlainObject(value)) {
    fail(`${field} must be an object.`);
  }
  return value;
}

function assertPayloadSize(value, maxLength, field) {
  if (JSON.stringify(value).length > maxLength) {
    fail(`${field} is too large. Limit it to ${maxLength} characters.`);
  }
}

function safeText(value, maxLength, field, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') {
    fail(`${field} must be text.`);
  }
  const text = value.trim();
  if (required && !text) {
    fail(`${field} is required.`);
  }
  if (text.length > maxLength) {
    fail(`${field} is too long. Limit it to ${maxLength} characters.`);
  }
  return text;
}

function safeId(value, field, { required = true } = {}) {
  const text = safeText(value, MAX_ID_CHARS, field, { required });
  if (!text) return '';
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    fail(`${field} can only contain letters, numbers, dots, underscores, and hyphens.`);
  }
  return text;
}

function safeStringArray(value, maxItems, field, maxItemLength = 800) {
  if (!Array.isArray(value)) {
    fail(`${field} must be a list.`);
  }
  if (value.length > maxItems) {
    fail(`${field} can include at most ${maxItems} items.`);
  }
  return value.map((item, index) => safeText(item, maxItemLength, `${field}[${index}]`, { required: true }));
}

function safeScore(value, field, max = 100) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    fail(`${field} must be an integer from 0 to ${max}.`);
  }
  return value;
}

function rejectUnknownKeys(value, allowedKeys, field) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${field} contains an unsupported field: ${key}.`);
    }
  }
}

function normalizeSystemsThinkingScore(value) {
  const scores = requirePlainObject(value, 'Systems-thinking score');
  const keys = new Set(Object.keys(systemsThinkingSchema.properties));
  rejectUnknownKeys(scores, keys, 'Systems-thinking score');

  return Object.fromEntries(
    Object.keys(systemsThinkingSchema.properties).map((key) => [key, safeScore(scores[key], `systems_thinking_score.${key}`, 5)])
  );
}

function normalizeInferredFlags(value) {
  if (value === undefined) return undefined;
  const flags = requirePlainObject(value, 'Inferred flags');
  const allowed = new Set(['likes_ambiguity', 'avoids_sales_pressure', 'prefers_async', 'low_call_tolerance']);
  rejectUnknownKeys(flags, allowed, 'Inferred flags');
  return Object.fromEntries(
    [...allowed].map((key) => [key, flags[key] === true])
  );
}

function normalizeWorkFitProfile(profile) {
  const source = requirePlainObject(profile, 'Profile');
  assertPayloadSize(source, MAX_PROFILE_CHARS, 'Profile payload');

  const normalized = {};
  for (const [field, maxItems] of Object.entries(profileArrayFields)) {
    normalized[field] = safeStringArray(source[field], maxItems, field);
  }
  for (const field of profileStringFields) {
    normalized[field] = safeText(source[field], 1200, field, { required: true });
  }

  normalized.systems_thinking_score = normalizeSystemsThinkingScore(source.systems_thinking_score);
  normalized.confidence_score = safeScore(source.confidence_score, 'confidence_score');

  const profileId = safeId(source.profile_id, 'Profile ID', { required: false });
  if (profileId) normalized.profile_id = profileId;

  if (source.profile_generation_mode !== undefined) {
    const mode = safeText(source.profile_generation_mode, 40, 'Profile generation mode', { required: true });
    if (!['live_gemini', 'local_first_pass'].includes(mode)) {
      fail('Profile generation mode is not supported.');
    }
    normalized.profile_generation_mode = mode;
  }

  if (source.live_profile_error !== undefined) {
    normalized.live_profile_error = safeText(source.live_profile_error, 500, 'Live profile error');
  }

  if (source.draft_profile_confidence_score !== undefined) {
    normalized.draft_profile_confidence_score = safeScore(source.draft_profile_confidence_score, 'Draft profile confidence score');
  }

  const inferredFlags = normalizeInferredFlags(source.inferred_flags);
  if (inferredFlags) normalized.inferred_flags = inferredFlags;

  return normalized;
}

function normalizeProfileAnswers(answers) {
  const source = requirePlainObject(answers, 'Profile answers');
  assertPayloadSize(source, MAX_PROFILE_ANSWERS_CHARS, 'Profile answers');

  const normalized = {};
  for (const [key, value] of Object.entries(source)) {
    if (!/^q([1-9]|1[0-9]|2[0-4])$/.test(key)) {
      fail(`Profile answers contain an unsupported field: ${key}.`);
    }
    normalized[key] = safeText(value, 2500, key);
  }

  return normalized;
}

function normalizeJobAd(jobAd, { requireMinimumDescription = false } = {}) {
  const source = requirePlainObject(jobAd, 'Job ad');
  rejectUnknownKeys(source, new Set(['title', 'company', 'description', 'notes']), 'Job ad');

  const normalized = {
    title: safeText(source.title, 160, 'Job title', { required: true }),
    company: safeText(source.company, 160, 'Company'),
    description: safeText(source.description, MAX_DESCRIPTION_CHARS, 'Job description', { required: true }),
    notes: safeText(source.notes, MAX_NOTES_CHARS, 'Notes')
  };

  if (requireMinimumDescription && normalized.description.length < 120) {
    fail('Add a job description of at least 120 characters.');
  }

  return normalized;
}

function normalizeReportSections(sections) {
  const source = requirePlainObject(sections, 'Evaluation sections');
  const allowed = new Set([...sectionStringFields, ...Object.keys(sectionArrayFields)]);
  rejectUnknownKeys(source, allowed, 'Evaluation sections');

  const normalized = {};
  for (const field of sectionStringFields) {
    normalized[field] = safeText(source[field], 1600, field, { required: true });
  }
  for (const [field, maxItems] of Object.entries(sectionArrayFields)) {
    normalized[field] = safeStringArray(source[field], maxItems, field, 600);
  }
  return normalized;
}

function normalizeScores(scores) {
  const source = requirePlainObject(scores, 'Evaluation scores');
  rejectUnknownKeys(source, new Set(scoreFields), 'Evaluation scores');
  return Object.fromEntries(scoreFields.map((field) => [field, safeScore(source[field], field)]));
}

function normalizeEvaluation(evaluation) {
  const source = requirePlainObject(evaluation, 'Evaluation');
  assertPayloadSize(source, MAX_PROFILE_CHARS, 'Evaluation payload');

  const decision = safeText(source.decision, 20, 'Decision', { required: true });
  if (!['Apply', 'Maybe', 'Skip'].includes(decision)) {
    fail('Decision must be Apply, Maybe, or Skip.');
  }

  const normalized = {
    jobTitle: safeText(source.jobTitle, 160, 'Job title', { required: true }),
    company: safeText(source.company, 160, 'Company'),
    overallRecommendation: safeText(source.overallRecommendation, 1600, 'Overall recommendation', { required: true }),
    decision,
    scores: normalizeScores(source.scores),
    sections: normalizeReportSections(source.sections),
    missingInformation: safeStringArray(source.missingInformation, 8, 'Missing information', 600),
    assumptions: safeStringArray(source.assumptions, 8, 'Assumptions', 600)
  };

  const id = safeId(source.id, 'Evaluation ID', { required: false });
  if (id) normalized.id = id;

  const profileId = safeId(source.profile_id, 'Profile ID', { required: false });
  if (profileId) normalized.profile_id = profileId;

  if (source.createdAt !== undefined) {
    normalized.createdAt = safeText(source.createdAt, 40, 'Created at', { required: true });
  }

  return normalized;
}

function normalizeFeedbackPayload(data) {
  const source = requirePlainObject(data, 'Feedback payload');
  rejectUnknownKeys(source, new Set(['profileId', 'evaluationId', 'value']), 'Feedback payload');

  const value = safeText(source.value, 80, 'Feedback value', { required: true });
  if (!feedbackValues.has(value)) {
    fail('Feedback value is not supported.');
  }

  return {
    profileId: safeId(source.profileId, 'Profile ID'),
    evaluationId: safeId(source.evaluationId, 'Evaluation ID'),
    value
  };
}

module.exports = {
  PayloadValidationError,
  MAX_DESCRIPTION_CHARS,
  MAX_PROFILE_CHARS,
  MAX_NOTES_CHARS,
  MAX_PROFILE_ANSWERS_CHARS,
  reportSchema,
  workFitProfileSchema,
  normalizeEvaluation,
  normalizeFeedbackPayload,
  normalizeJobAd,
  normalizeProfileAnswers,
  normalizeWorkFitProfile
};
