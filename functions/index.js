const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineInt, defineSecret, defineString } = require('firebase-functions/params');
const { GoogleGenAI } = require('@google/genai');
const {
  PayloadValidationError,
  reportSchema,
  workFitProfileSchema,
  normalizeEvaluation,
  normalizeFeedbackPayload,
  normalizeJobAd,
  normalizeProfileAnswers,
  normalizeWorkFitProfile
} = require('./payloadValidation');

initializeApp();

const db = getFirestore();
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const geminiModel = defineString('GEMINI_MODEL', { default: 'gemini-3.5-flash' });
const adminEmails = defineString('ADMIN_EMAILS', { default: '' });
const userDailyLimit = defineInt('USER_DAILY_EVALUATION_LIMIT', { default: 5 });
const globalDailyLimit = defineInt('GLOBAL_DAILY_EVALUATION_LIMIT', { default: 50 });

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function withPayloadValidation(callback) {
  try {
    return callback();
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      throw new HttpsError('invalid-argument', error.message);
    }
    throw error;
  }
}

function validateRequest(data) {
  return withPayloadValidation(() => ({
    profile: normalizeWorkFitProfile(data?.profile),
    jobAd: normalizeJobAd(data?.jobAd, { requireMinimumDescription: true })
  }));
}

function validateProfileRequest(data) {
  const payload = withPayloadValidation(() => ({
    answers: normalizeProfileAnswers(data?.answers),
    draftProfile: normalizeWorkFitProfile(data?.draftProfile)
  }));
  const answeredCount = Object.values(payload.answers).filter((value) => String(value || '').trim().length > 0).length;
  if (answeredCount < 12) {
    throw new HttpsError('invalid-argument', 'Answer more profile questions before generating the final work-fit profile.');
  }

  return payload;
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

function requireAdmin(request) {
  if (!isQuotaExempt(request.auth?.token || {})) {
    throw new HttpsError('permission-denied', 'Admin access is required.');
  }
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
    'Do not say a skill, tool, or evidence item is absent, missing, or not highlighted if it appears anywhere in the work-fit profile JSON.',
    'If a tool appears in the profile but the role needs deeper, more specific, or domain-specific proof, say exactly that instead.',
    'Treat Power BI, BI dashboards, reporting dashboards, and SQL dashboards as dashboarding or BI evidence when judging skills match.',
    'Separate tool presence from evidence depth. Example: Power BI may be present, while executive-ready financial reporting proof may still be thin.',
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

function mergeUniqueLimited(primary = [], secondary = [], limit = 20) {
  const seen = new Set();
  const merged = [];
  for (const value of [...primary, ...secondary]) {
    const text = String(value || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(text);
    if (merged.length >= limit) {
      break;
    }
  }
  return merged;
}

function preserveDraftEvidence(profile, draftProfile) {
  return {
    ...profile,
    strongest_evidence: mergeUniqueLimited(profile.strongest_evidence, draftProfile.strongest_evidence, 10),
    tools_and_skills: mergeUniqueLimited(profile.tools_and_skills, draftProfile.tools_and_skills, 20),
    misunderstood_resume_signals: mergeUniqueLimited(profile.misunderstood_resume_signals, draftProfile.misunderstood_resume_signals, 8)
  };
}

function buildProfilePrompt(answers, draftProfile) {
  return [
    'You are CogFit Jobs, creating a final Work-Fit Profile for a nontraditional candidate.',
    'Use the supplied questionnaire answers as the primary evidence.',
    'Use the JavaScript first-pass profile only as a rough draft, not as ground truth.',
    'Preserve explicitly named tools, platforms, project artifacts, and dashboard evidence from the answers unless they are clearly irrelevant duplicates.',
    'Do not drop named evidence such as SQL, Power BI, BI dashboards, APIs, programming languages, deployed apps, or portfolio artifacts.',
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
    const generatedProfile = await generateStructuredGemini(
      buildProfilePrompt(answers, draftProfile),
      workFitProfileSchema,
      3200
    );
    return withPayloadValidation(() => normalizeWorkFitProfile(preserveDraftEvidence(generatedProfile, draftProfile)));
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
    const { profile, answers } = withPayloadValidation(() => ({
      profile: normalizeWorkFitProfile(request.data?.profile),
      answers: normalizeProfileAnswers(request.data?.answers || {})
    }));

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
    const { profile, evaluation, jobAd } = withPayloadValidation(() => ({
      profile: normalizeWorkFitProfile(request.data?.profile),
      evaluation: normalizeEvaluation(request.data?.evaluation),
      jobAd: normalizeJobAd(request.data?.jobAd, { requireMinimumDescription: true })
    }));

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
    const { profileId, evaluationId, value } = withPayloadValidation(() => normalizeFeedbackPayload(request.data));
    await db.collection(`users/${request.auth.uid}/profiles/${profileId}/feedback`).add({
      evaluationId: String(evaluationId),
      value: String(value),
      createdAt: FieldValue.serverTimestamp()
    });
    return { ok: true };
  }
);

exports.getAdminFeedbackSummary = onCall(
  {
    region: 'us-central1',
    invoker: 'public',
    enforceAppCheck: true,
    maxInstances: 1,
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    await requireProtectedUser(request, 'admin dashboard access');
    requireAdmin(request);

    const snapshot = await db.collectionGroup('feedback').limit(500).get();
    const counts = {};
    const recent = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const value = String(data.value || 'unknown');
      counts[value] = (counts[value] || 0) + 1;
      recent.push({
        id: doc.id,
        value,
        evaluationId: String(data.evaluationId || ''),
        path: doc.ref.path,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null
      });
    });

    recent.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return {
      total: snapshot.size,
      counts,
      recent: recent.slice(0, 25)
    };
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

    return withPayloadValidation(() => normalizeEvaluation({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      jobTitle: jobAd.title,
      company: jobAd.company || 'Unknown company',
      ...report,
      assumptions: [
        ...(report.assumptions || []),
        'This live report is model-generated from the supplied profile and job ad, not a hiring prediction.'
      ]
    }));
  }
);
