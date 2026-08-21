import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { sampleProfileAnswers } from '../data/sampleProfiles';
import { generateWorkFitProfile, needsAdaptiveQuestions } from './profileScoring';

const require = createRequire(import.meta.url);
const { normalizeWorkFitProfile } = require('../../functions/payloadValidation.js');

describe('generateWorkFitProfile', () => {
  it('preserves concrete evidence from profile answers', () => {
    const profile = generateWorkFitProfile(sampleProfileAnswers);

    expect(profile.tools_and_skills).toEqual(expect.arrayContaining(['SQL', 'Power BI']));
    expect(profile.strongest_evidence.join(' ')).toMatch(/Cloud-hosted AI assistant/i);
    expect(profile.systems_thinking_score.system_mapping).toBeGreaterThanOrEqual(4);
    expect(profile.confidence_score).toBeGreaterThanOrEqual(80);
    expect(needsAdaptiveQuestions(profile)).toBe(false);
  });

  it('lowers confidence and names missing evidence for sparse answers', () => {
    const profile = generateWorkFitProfile({ q1: 'data roles', q8: 'analysis' });

    expect(profile.confidence_score).toBeLessThan(30);
    expect(profile.missing_information).toEqual(expect.arrayContaining([
      'specific project evidence',
      'tools and skills evidence'
    ]));
    expect(needsAdaptiveQuestions(profile)).toBe(true);
  });

  it('deduplicates and caps resume-seeded evidence before server validation', () => {
    const evidence = Array.from({ length: 10 }, (_, index) => `Project evidence ${index + 1}`);
    const profile = generateWorkFitProfile({
      ...sampleProfileAnswers,
      q4: evidence.join('; '),
      q5: evidence.join(', ')
    });

    expect(profile.strongest_evidence).toEqual(evidence);
    expect(profile.strongest_evidence).toHaveLength(10);
    expect(() => normalizeWorkFitProfile(profile)).not.toThrow();
  });

  it('keeps distinct work and project evidence when their combined total exceeds the limit', () => {
    const workEvidence = Array.from({ length: 10 }, (_, index) => `Work example ${index + 1}`);
    const projectEvidence = Array.from({ length: 10 }, (_, index) => `Project example ${index + 1}`);
    const profile = generateWorkFitProfile({
      ...sampleProfileAnswers,
      q4: workEvidence.join('; '),
      q5: projectEvidence.join('; ')
    });

    expect(profile.strongest_evidence).toEqual([
      'Work example 1',
      'Project example 1',
      'Work example 2',
      'Project example 2',
      'Work example 3',
      'Project example 3',
      'Work example 4',
      'Project example 4',
      'Work example 5',
      'Project example 5'
    ]);
    expect(() => normalizeWorkFitProfile(profile)).not.toThrow();
  });
});
