import { generateWorkFitProfile } from './profileScoring';
import { mockEvaluateJob, mockAdaptiveQuestions } from './evaluator';

export const llmAdapter = {
  async generateProfileSummary(profileAnswers) {
    return generateWorkFitProfile(profileAnswers);
  },
  async evaluateJob(profile, jobAd) {
    const mode = import.meta.env.VITE_COGFIT_EVALUATOR_MODE || 'mock';
    if (mode !== 'mock') {
      return {
        ...mockEvaluateJob(profile, jobAd),
        assumptions: ['Live LLM mode is not wired in this frontend prototype. Returned deterministic mock output instead.']
      };
    }
    return mockEvaluateJob(profile, jobAd);
  },
  async generateAdaptiveQuestions(profile, jobAd, currentConfidence) {
    return mockAdaptiveQuestions(profile, jobAd, currentConfidence);
  }
};
