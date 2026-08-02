import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { sampleEvaluations } from '../data/sampleEvaluations';
import { sampleProfile } from '../data/sampleProfiles';

const require = createRequire(import.meta.url);
const {
  PayloadValidationError,
  normalizeEvaluation,
  normalizeEvaluationEvidence,
  normalizeFeedbackPayload,
  normalizeJobAd,
  normalizeProfileAnswers,
  normalizeWorkFitProfile
} = require('../../functions/payloadValidation.js');

describe('payload validation', () => {
  it('accepts and trims a valid saved profile payload', () => {
    const profile = normalizeWorkFitProfile({
      ...sampleProfile,
      profile_id: 'profile_123',
      profile_generation_mode: 'live_gemini',
      draft_profile_confidence_score: 84,
      legacy_view_state: { expanded: true }
    });

    expect(profile.profile_id).toBe('profile_123');
    expect(profile.tools_and_skills).toEqual(expect.arrayContaining(['SQL', 'Power BI']));
    expect(profile.confidence_score).toBe(88);
    expect(profile.legacy_view_state).toBeUndefined();
  });

  it('rejects path-like profile IDs before Firestore writes', () => {
    expect(() => normalizeWorkFitProfile({
      ...sampleProfile,
      profile_id: 'profile/escape'
    })).toThrow(PayloadValidationError);
  });

  it('accepts the expected evaluation report shape', () => {
    const evaluation = normalizeEvaluation({
      ...sampleEvaluations['fde-ai-enablement'],
      profile_id: 'profile_123',
      clientOnlyStatus: 'shown-before-cloud-save'
    });

    expect(evaluation.id).toBe('sample-fde-ai-enablement');
    expect(evaluation.profile_id).toBe('profile_123');
    expect(evaluation.scores.roleFit).toBe(91);
    expect(evaluation.clientOnlyStatus).toBeUndefined();
  });

  it('rejects out-of-range scores and unsupported feedback values', () => {
    expect(() => normalizeEvaluation({
      ...sampleEvaluations['fde-ai-enablement'],
      scores: {
        ...sampleEvaluations['fde-ai-enablement'].scores,
        roleFit: 101
      }
    })).toThrow(PayloadValidationError);

    expect(() => normalizeFeedbackPayload({
      profileId: 'profile_123',
      evaluationId: 'eval_123',
      value: 'looks fine'
    })).toThrow(PayloadValidationError);
  });

  it('rejects unknown answer fields and too-short live job descriptions', () => {
    expect(() => normalizeProfileAnswers({ q1: 'AI roles', bad: 'unexpected' })).toThrow(PayloadValidationError);
    expect(() => normalizeJobAd({
      title: 'AI Analyst',
      company: 'Example Co',
      description: 'Too short.',
      notes: ''
    }, { requireMinimumDescription: true })).toThrow(PayloadValidationError);
  });

  it('keeps resume qualifications separate from questionnaire evidence', () => {
    const evidence = normalizeEvaluationEvidence({
      resumeEvidence: {
        sourceType: 'resume',
        characterCount: 1200,
        confidence: 82,
        importedAt: '2026-07-27T20:00:00.000Z',
        tools: ['SQL', 'Power BI'],
        evidence: ['dashboarding'],
        domains: ['business intelligence'],
        titles: ['Operations Analyst'],
        projects: ['Built an executive reporting dashboard.'],
        systemsEvidence: ['Automated a monthly reconciliation workflow.']
      },
      questionnaireEvidence: {
        answers: {
          q8: 'Ambiguous problems with ownership.',
          q9: 'High-volume repetitive work.'
        },
        profile: sampleProfile
      }
    });

    expect(evidence.resumeEvidence.titles).toEqual(['Operations Analyst']);
    expect(evidence.resumeEvidence.projects).toEqual(['Built an executive reporting dashboard.']);
    expect(evidence.questionnaireEvidence.answers.q8).toBe('Ambiguous problems with ownership.');
    expect(evidence.questionnaireEvidence.profile.tools_and_skills).toContain('SQL');
    expect(evidence.questionnaireEvidence).not.toHaveProperty('resumeEvidence');
  });
});
