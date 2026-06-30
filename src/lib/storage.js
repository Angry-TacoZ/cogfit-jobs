const keys = {
  answers: 'cogfit.profileAnswers',
  profile: 'cogfit.generatedProfile',
  resumeEvidence: 'cogfit.resumeEvidence',
  resumeText: 'cogfit.resumeText',
  evaluations: 'cogfit.evaluations',
  feedback: 'cogfit.feedback'
};

export function loadItem(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfileAnswers() {
  return loadItem(keys.answers, {});
}

export function saveProfileAnswers(answers) {
  saveItem(keys.answers, answers);
}

export function loadGeneratedProfile() {
  return loadItem(keys.profile, null);
}

export function saveGeneratedProfile(profile) {
  saveItem(keys.profile, profile);
}

export function loadResumeEvidence() {
  return loadItem(keys.resumeEvidence, null);
}

export function saveResumeEvidence(evidence) {
  saveItem(keys.resumeEvidence, evidence);
}

export function loadResumeText() {
  return loadItem(keys.resumeText, '');
}

export function saveResumeText(text) {
  saveItem(keys.resumeText, String(text || ''));
}

export function loadEvaluations() {
  return loadItem(keys.evaluations, []);
}

function evaluationKey(evaluation) {
  if (evaluation?.id) return `id:${evaluation.id}`;
  return [
    evaluation?.jobTitle || 'untitled',
    evaluation?.company || 'unknown',
    evaluation?.createdAt || 'undated'
  ].join('|');
}

function evaluationTime(evaluation) {
  const parsed = Date.parse(evaluation?.createdAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mergeEvaluations(...groups) {
  const seen = new Set();
  const merged = [];

  groups.flat().forEach((evaluation) => {
    if (!evaluation || typeof evaluation !== 'object') return;
    const key = evaluationKey(evaluation);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(evaluation);
  });

  return merged
    .sort((a, b) => evaluationTime(b) - evaluationTime(a))
    .slice(0, 12);
}

export function saveEvaluations(evaluations) {
  saveItem(keys.evaluations, mergeEvaluations(evaluations));
}

export function saveEvaluation(evaluation) {
  saveEvaluations([evaluation, ...loadEvaluations()]);
}

export function saveFeedback(evaluationId, value) {
  const feedback = loadItem(keys.feedback, []);
  saveItem(keys.feedback, [{ evaluationId, value, createdAt: new Date().toISOString() }, ...feedback]);
}
