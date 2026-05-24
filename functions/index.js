const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineInt, defineSecret, defineString } = require('firebase-functions/params');
const { GoogleGenAI } = require('@google/genai');

initializeApp();

const db = getFirestore();
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const geminiModel = defineString('GEMINI_MODEL', { default: 'gemini-3.5-flash' });
const userDailyLimit = defineInt('USER_DAILY_EVALUATION_LIMIT', { default: 5 });
const globalDailyLimit = defineInt('GLOBAL_DAILY_EVALUATION_LIMIT', { default: 100 });

const MAX_DESCRIPTION_CHARS = 12000;
const MAX_PROFILE_CHARS = 16000;
const MAX_NOTES_CHARS = 1000;

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

async function enforceDailyQuota(uid) {
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

function parseGeminiJson(response) {
  if (!response.text) {
    throw new Error('Gemini response did not include output text.');
  }

  return JSON.parse(response.text);
}

exports.evaluateJob = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    maxInstances: 1,
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [geminiApiKey]
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'Sign in is required before live evaluation.');
    }
    if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
      throw new HttpsError('permission-denied', 'Anonymous accounts cannot run live evaluation.');
    }
    if (!request.app) {
      throw new HttpsError('failed-precondition', 'Firebase App Check is required before live evaluation.');
    }

    const { profile, jobAd } = validateRequest(request.data);
    await enforceDailyQuota(request.auth.uid);

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured on the server.');
    }

    const model = geminiModel.value();
    const client = new GoogleGenAI({ apiKey });
    let response;
    try {
      response = await client.models.generateContent({
        model,
        contents: buildPrompt(profile, jobAd),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: reportSchema,
          maxOutputTokens: 1800,
          temperature: 0.2
        }
      });
    } catch (error) {
      console.error('Gemini request failed', error);
      throw new HttpsError('internal', 'Live evaluator request failed before producing a report.');
    }

    let report;
    try {
      report = parseGeminiJson(response);
    } catch (error) {
      console.error('Failed to parse Gemini structured output', error);
      throw new HttpsError('internal', 'Live evaluator returned an unreadable report.');
    }

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
