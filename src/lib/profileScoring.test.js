import { describe, expect, it } from 'vitest';
import { sampleProfileAnswers } from '../data/sampleProfiles';
import { generateWorkFitProfile, needsAdaptiveQuestions } from './profileScoring';

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
});
