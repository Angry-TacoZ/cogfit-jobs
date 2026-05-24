const keys = {
  answers: 'cogfit.profileAnswers',
  profile: 'cogfit.generatedProfile',
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

export function loadEvaluations() {
  return loadItem(keys.evaluations, []);
}

export function saveEvaluation(evaluation) {
  const evaluations = loadEvaluations();
  saveItem(keys.evaluations, [evaluation, ...evaluations].slice(0, 12));
}

export function saveFeedback(evaluationId, value) {
  const feedback = loadItem(keys.feedback, []);
  saveItem(keys.feedback, [{ evaluationId, value, createdAt: new Date().toISOString() }, ...feedback]);
}
