import { generateWorkFitProfile } from './profileScoring';
import { generateAdaptiveQuestions } from './evaluator';
import { callEvaluateJob, callGenerateProfile } from './firebaseClient';

export const llmAdapter = {
  async generateProfileSummary(profileAnswers) {
    const draftProfile = generateWorkFitProfile(profileAnswers);
    const finalProfile = await callGenerateProfile(profileAnswers, draftProfile);
    return {
      ...finalProfile,
      draft_profile_confidence_score: draftProfile.confidence_score
    };
  },
  async evaluateJob(profile, jobAd) {
    return callEvaluateJob(profile, jobAd);
  },
  async generateAdaptiveQuestions(profile, jobAd, currentConfidence) {
    return generateAdaptiveQuestions(profile, jobAd, currentConfidence);
  }
};
