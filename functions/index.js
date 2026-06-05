const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineInt, defineSecret, defineString } = require('firebase-functions/params');
const { GoogleGenAI } = require('@google/genai');

initializeApp();

const db = getFirestore();
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const geminiModel = defineString('GEMINI_MODEL', { default: 'gemini-3.5-flash' });
const adminEmails = defineString('ADMIN_EMAILS', { default: '' });
const userDailyLimit = defineInt('USER_DAILY_EVALUATION_LIMIT', { default: 5 });
const globalDailyLimit = defineInt('GLOBAL_DAILY_EVALUATION_LIMIT', { default: 50 });

const MAX_DESCRIPTION_CHARS = 12000;
const MAX_PROFILE_CHARS = 16000;
const MAX_NOTES_CHARS = 1000;
const MAX_PROFILE_ANSWERS_CHARS = 18000;

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

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeText(value, maxLength, field) {
  const text = String(value || '').trim();
  if (text.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} is too long. Limit it to ${maxLength} characters.`);
  }
  return text;
}

function validateRequest(data) {
  const profile = data && data.profile;
  const jobAd = data && data.jobAd;
  if (!profile || typeof profile !== 'object') {
    throw new HttpsError('invalid-argument', 'A generated work-fit profile is required.');
  }
  if (!jobAd || typeof jobAd !== 'object') {
    throw new HttpsError('invalid-argument', 'A job ad object is required.');
  }

  const profileJson = JSON.stringify(profile);
  if (profileJson.length > MAX_PROFILE_CHARS) {
    throw new HttpsError('invalid-argument', `Profile payload is too large. Limit it to ${MAX_PROFILE_CHARS} characters.`);
  }

  const title = safeText(jobAd.title, 160, 'Job title');
  const company = safeText(jobAd.company, 160, 'Company');
  const description = safeText(jobAd.description, MAX_DESCRIPTION_CHARS, 'Job description');
  const notes = safeText(jobAd.notes, MAX_NOTES_CHARS, 'Notes');

  if (!title || !description || description.length < 120) {
    throw new HttpsError('invalid-argument', 'Add a job title and a job description of at least 120 characters.');
  }

  return { profile, jobAd: { title, company, description, notes } };
}

function validateProfileRequest(data) {
  const answers = data && data.answers;
  const draftProfile = data && data.draftProfile;

  if (!answers || typeof answers !== 'object') {
    throw new HttpsError('invalid-argument', 'Profile answers are required.');
  }
  if (!draftProfile || typeof draftProfile !== 'object') {
    throw new HttpsError('invalid-argument', 'A JavaScript first-pass profile is required.');
  }

  const answersJson = JSON.stringify(answers);
  const draftJson = JSON.stringify(draftProfile);

  if (answersJson.length > MAX_PROFILE_ANSWERS_CHARS) {
    throw new HttpsError('invalid-argument', `Profile answers are too large. Limit them to ${MAX_PROFILE_ANSWERS_CHARS} characters.`);
  }
  if (draftJson.length > MAX_PROFILE_CHARS) {
    throw new HttpsError('invalid-argument', `Draft profile is too large. Limit it to ${MAX_PROFILE_CHARS} characters.`);
  }

  const answeredCount = Object.values(answers).filter((value) => String(value || '').trim().length > 0).length;
  if (answeredCount < 12) {
    throw new HttpsError('invalid-argument', 'Answer more profile questions before generating the final work-fit profile.');
  }

  return { answers, draftProfile };
}

function isQuotaExempt(authToken = {}) {
  if (authToken.admin === true) {
    return true;
  }

  const email = String(authToken.email || '').trim().toLowerCase();
  if (!email) {
    return false;
  }

  return adminEmails.value()
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}

async function enforceDailyQuota(uid, authToken) {
  if (isQuotaExempt(authToken)) {
    return;
  }

  const day = getDayKey();
  const userRef = db.collection('usageCounters').doc(`user_${uid}_${day}`);
  const globalRef = db.collection('usageCounters').doc(`global_${day}`);
  const userLimit = userDailyLimit.value();
  const allUsersLimit = globalDailyLimit.value();

  await db.runTransaction(async (transaction) => {
    const [userSnap, globalSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(globalRef)
    ]);
    const userCount = userSnap.exists ? userSnap.data().count || 0 : 0;
    const globalCount = globalSnap.exists ? globalSnap.data().count || 0 : 0;

    if (userCount >= userLimit) {
      throw new HttpsError('resource-exhausted', `Daily live analysis limit reached. Limit: ${userLimit}.`);
    }
    if (globalCount >= allUsersLimit) {
      throw new HttpsError('resource-exhausted', 'Global daily live analysis limit reached. Try again later.');
    }

    transaction.set(userRef, {
      count: FieldValue.increment(1),
      day,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(globalRef, {
      count: FieldValue.increment(1),
      day,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

function buildPrompt(profile, jobAd) {
  return [
    'You are CogFit Jobs, a direct job-fit evaluator for nontraditional candidates.',
    'Do not act like a generic career coach. Do not flatter. Do not fake certainty.',
    'Base the report only on the supplied work-fit profile and job ad.',
    'State uncertainty and missing evidence explicitly.',
    'Score callback likelihood separately from actual ability and sustainability.',
    'Culture / Workstyle Risk is risk severity, so higher is worse.',
    'Avoid em dashes in all prose.',
    '',
    'Scoring requirements:',
    '- Role Fit Score considers skills match, project evidence, domain match, role-family match, and title or credential gap.',
    '- Callback Likelihood considers formal title match, years, degree or cert requirements, ATS keyword match, portfolio evidence, competitiveness, and networking bypass potential.',
    '- Cognitive Fit Score considers autonomy, ambiguity type, complexity, repetition, customer/contact load, communication mode, building versus operating versus selling balance, travel, and schedule demands.',
    '- Culture / Workstyle Risk considers micromanagement, quota pressure, call-center work, heavy live meetings, political friction, vague fast-paced chaos, travel, unclear ownership, and innovation theater.',
    '',
    `Work-fit profile JSON:\n${JSON.stringify(profile, null, 2)}`,
    '',
    `Job ad JSON:\n${JSON.stringify(jobAd, null, 2)}`
  ].join('\n');
}

function buildProfilePrompt(answers, draftProfile) {
  return [
    'You are CogFit Jobs, creating a final Work-Fit Profile for a nontraditional candidate.',
    'Use the supplied questionnaire answers as the primary evidence.',
    'Use the JavaScript first-pass profile only as a rough draft, not as ground truth.',
    'Do not diagnose medical conditions. Do not add claims the user did not support.',
    'If evidence is missing, lower confidence and name the missing information.',
    'Infer systems thinking from answer structure, not self-labels.',
    'Look for root causes, downstream effects, incentives, workflows, constraints, failure modes, repeated patterns, and process redesign.',
    'Avoid em dashes in all prose.',
    '',
    'Final profile fields must be concise, evidence-based, and useful for later job-ad evaluation.',
    '',
    `Questionnaire answers JSON:\n${JSON.stringify(answers, null, 2)}`,
    '',
    `JavaScript first-pass profile JSON:\n${JSON.stringify(draftProfile, null, 2)}`
  ].join('\n');
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    return candidate;
  }

  const start = candidate.indexOf('{');
  if (start === -1) {
    throw new Error('Gemini response did not contain a JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{') {
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, index + 1);
      }
    }
  }

  throw new Error('Gemini response contained incomplete JSON.');
}

function parseGeminiJson(response) {
  if (!response.text) {
    throw new Error('Gemini response did not include output text.');
  }

  return JSON.parse(extractJsonObject(response.text));
}

async function requireProtectedUser(request, actionLabel, { consumeQuota = false } = {}) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', `Sign in is required before ${actionLabel}.`);
  }
  if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('permission-denied', `Anonymous accounts cannot run ${actionLabel}.`);
  }
  if (!request.app) {
    throw new HttpsError('failed-precondition', `Firebase App Check is required before ${actionLabel}.`);
  }
  if (consumeQuota) {
    await enforceDailyQuota(request.auth.uid, request.auth.token);
  }
}

function apiErrorSummary(error) {
  return {
    name: error?.name,
    status: error?.status,
    code: error?.code,
    message: String(error?.message || '').slice(0, 500)
  };
}

function isTransientGeminiError(error) {
  const status = Number(error?.status);
  const message = String(error?.message || '').toLowerCase();
  return status === 429 || status >= 500 || message.includes('unavailable') || message.includes('high demand');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyGeminiFailures(failures) {
  const statusValues = failures.map((failure) => Number(failure.error?.status)).filter(Boolean);
  const messages = failures.map((failure) => String(failure.error?.message || '').toLowerCase()).join('\n');

  if (statusValues.some((status) => status === 401 || status === 403) || messages.includes('permission') || messages.includes('api key')) {
    return {
      code: 'failed-precondition',
      message: 'Gemini rejected the server request. The API key, billing, or model API permissions may need to be checked.'
    };
  }
  if (statusValues.some((status) => status === 404) || messages.includes('not found')) {
    return {
      code: 'failed-precondition',
      message: 'The configured Gemini model is not available to this API key yet.'
    };
  }
  if (statusValues.some((status) => status === 429) || messages.includes('quota')) {
    return {
      code: 'resource-exhausted',
      message: 'Gemini quota or rate limit was reached. Try again later.'
    };
  }
  if (statusValues.some((status) => status >= 500) || messages.includes('unavailable')) {
    return {
      code: 'unavailable',
      message: 'Gemini was temporarily unavailable while generating the report. Try again in a few minutes.'
    };
  }
  if (failures.some((failure) => failure.error?.name === 'SyntaxError' || String(failure.error?.message || '').includes('JSON'))) {
    return {
      code: 'failed-precondition',
      message: 'Gemini returned output that could not be parsed as the expected structured profile. Try again with slightly shorter answers.'
    };
  }

  return {
    code: 'failed-precondition',
    message: 'Live Gemini generation failed after retrying supported JSON output modes.'
  };
}

function plainJsonPrompt(prompt, schema) {
  return [
    prompt,
    '',
    'Return only valid JSON. Do not wrap it in Markdown.',
    'The JSON must match this schema:',
    JSON.stringify(schema)
  ].join('\n');
}

async function callGeminiJson(client, model, prompt, schema, maxOutputTokens, schemaMode) {
  const config = {
    responseMimeType: 'application/json',
    maxOutputTokens,
    temperature: 0.2
  };

  if (schemaMode === 'schema') {
    config.responseSchema = schema;
  }
  if (schemaMode === 'jsonSchema') {
    config.responseJsonSchema = schema;
  }

  const contents = schemaMode === 'plain'
    ? plainJsonPrompt(prompt, schema)
    : prompt;

  return client.models.generateContent({
    model,
    contents,
    config
  });
}

async function generateStructuredGemini(prompt, schema, maxOutputTokens) {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured on the server.');
  }

  const model = geminiModel.value();
  const client = new GoogleGenAI({ apiKey });
  const attempts = [
    { model, schemaMode: 'schema' },
    { model, schemaMode: 'jsonSchema' },
    { model, schemaMode: 'plain' }
  ];

  const failures = [];
  for (const attempt of attempts) {
    for (let retry = 0; retry < 3; retry += 1) {
      try {
        const response = await callGeminiJson(client, attempt.model, prompt, schema, maxOutputTokens, attempt.schemaMode);
        return parseGeminiJson(response);
      } catch (error) {
        const failure = { ...attempt, retry, error: apiErrorSummary(error) };
        failures.push(failure);
        console.error('Gemini JSON generation attempt failed', failure);
        if (!isTransientGeminiError(error) || retry === 2) {
          break;
        }
        await sleep(1200 * (retry + 1));
      }
    }
  }

  const classified = classifyGeminiFailures(failures);
  throw new HttpsError(classified.code, classified.message);
}

exports.generateProfile = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [geminiApiKey]
  },
  async (request) => {
    await requireProtectedUser(request, 'live profile generation', { consumeQuota: true });
    const { answers, draftProfile } = validateProfileRequest(request.data);
    return generateStructuredGemini(
      buildProfilePrompt(answers, draftProfile),
      workFitProfileSchema,
      3200
    );
  }
);

exports.saveProfile = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    await requireProtectedUser(request, 'profile storage');
    const { profile, answers } = request.data || {};
    if (!profile || typeof profile !== 'object') {
      throw new HttpsError('invalid-argument', 'A profile object is required.');
    }
    if (JSON.stringify(profile).length > MAX_PROFILE_CHARS) {
      throw new HttpsError('invalid-argument', `Profile payload is too large. Limit it to ${MAX_PROFILE_CHARS} characters.`);
    }
    if (answers && JSON.stringify(answers).length > MAX_PROFILE_ANSWERS_CHARS) {
      throw new HttpsError('invalid-argument', `Profile answers are too large. Limit them to ${MAX_PROFILE_ANSWERS_CHARS} characters.`);
    }

    const profileId = profile.profile_id || crypto.randomUUID();
    const profileWithId = { ...profile, profile_id: profileId };
    await db.doc(`users/${request.auth.uid}/profiles/${profileId}`).set({
      profile: profileWithId,
      answers: answers || {},
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return profileWithId;
  }
);

exports.saveEvaluation = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    await requireProtectedUser(request, 'job evaluation storage');
    const { profile, evaluation, jobAd } = request.data || {};
    if (!profile || typeof profile !== 'object' || !evaluation || typeof evaluation !== 'object') {
      throw new HttpsError('invalid-argument', 'Profile and evaluation objects are required.');
    }
    if (JSON.stringify(profile).length > MAX_PROFILE_CHARS || JSON.stringify(evaluation).length > MAX_PROFILE_CHARS) {
      throw new HttpsError('invalid-argument', 'Profile or evaluation payload is too large.');
    }

    const profileId = profile.profile_id || 'default-profile';
    const evaluationId = evaluation.id || crypto.randomUUID();
    const evaluationWithId = { ...evaluation, id: evaluationId, profile_id: profileId };
    const profileRef = db.doc(`users/${request.auth.uid}/profiles/${profileId}`);
    await profileRef.set({
      profile: { ...profile, profile_id: profileId },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await profileRef.collection('evaluations').doc(evaluationId).set({
      evaluation: evaluationWithId,
      jobAd: jobAd || {},
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return evaluationWithId;
  }
);

exports.saveFeedback = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    await requireProtectedUser(request, 'feedback storage');
    const { profileId, evaluationId, value } = request.data || {};
    if (!profileId || !evaluationId || !value) {
      throw new HttpsError('invalid-argument', 'Profile ID, evaluation ID, and feedback value are required.');
    }
    await db.collection(`users/${request.auth.uid}/profiles/${profileId}/feedback`).add({
      evaluationId: String(evaluationId),
      value: String(value),
      createdAt: FieldValue.serverTimestamp()
    });
    return { ok: true };
  }
);

exports.evaluateJob = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [geminiApiKey]
  },
  async (request) => {
    await requireProtectedUser(request, 'live evaluation', { consumeQuota: true });
    const { profile, jobAd } = validateRequest(request.data);
    const report = await generateStructuredGemini(buildPrompt(profile, jobAd), reportSchema, 1800);

    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      jobTitle: jobAd.title,
      company: jobAd.company || 'Unknown company',
      ...report,
      assumptions: [
        ...(report.assumptions || []),
        'This live report is model-generated from the supplied profile and job ad, not a hiring prediction.'
      ]
    };
  }
);
