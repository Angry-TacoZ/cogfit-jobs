import { generateWorkFitProfile } from './profileScoring';
import { generateAdaptiveQuestions } from './evaluator';
import { callEvaluateJob } from './firebaseClient';

export const llmAdapter = {
  async generateProfileSummary(profileAnswers) {
    return generateWorkFitProfile(profileAnswers);
  },
  async evaluateJob(profile, jobAd) {
    return callEvaluateJob(profile, jobAd);
  },
  async generateAdaptiveQuestions(profile, jobAd, currentConfidence) {
    return generateAdaptiveQuestions(profile, jobAd, currentConfidence);
  }
};
