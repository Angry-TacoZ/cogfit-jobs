import { generateWorkFitProfile } from './profileScoring';
import { generateAdaptiveQuestions } from './evaluator';
import { callEvaluateJob, callGenerateProfile } from './firebaseClient';

export const llmAdapter = {
  async generateProfileSummary(profileAnswers) {
    const draftProfile = generateWorkFitProfile(profileAnswers);
    try {
      const finalProfile = await callGenerateProfile(profileAnswers, draftProfile);
      return {
        ...finalProfile,
        profile_generation_mode: 'live_gemini',
        draft_profile_confidence_score: draftProfile.confidence_score
      };
    } catch (profileError) {
      return {
        ...draftProfile,
        profile_generation_mode: 'local_first_pass',
        live_profile_error: profileError?.message || 'Live Gemini profile generation failed.'
      };
    }
  },
  async evaluateJob(profile, jobAd) {
    return callEvaluateJob(profile, jobAd);
  },
  async generateAdaptiveQuestions(profile, jobAd, currentConfidence) {
    return generateAdaptiveQuestions(profile, jobAd, currentConfidence);
  }
};
