import { describe, expect, it } from 'vitest';
import { sampleEvaluations } from '../data/sampleEvaluations';
import { evaluationToMarkdown, generateAdaptiveQuestions } from './evaluator';

describe('evaluationToMarkdown', () => {
  it('exports the core report sections and scores', () => {
    const markdown = evaluationToMarkdown(sampleEvaluations['fde-ai-enablement']);

    expect(markdown).toContain('# CogFit Jobs Report: AI Enablement / Forward Deployed AI Engineer at Northstar Workflow Labs');
    expect(markdown).toContain('## Scores');
    expect(markdown).toContain('- roleFit: 91');
    expect(markdown).toContain('## What to Verify Before Applying');
    expect(markdown).toContain('## Assumptions');
  });
});

describe('generateAdaptiveQuestions', () => {
  it('asks targeted follow-up questions for low-confidence profiles', () => {
    const questions = generateAdaptiveQuestions(
      {
        missing_information: ['specific project evidence', 'clear negative-fit history'],
        confidence_score: 55
      },
      { title: 'AI Analyst' },
      55
    );

    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatch(/artifacts/i);
    expect(questions[1]).toMatch(/unsustainable/i);
    expect(questions[2]).toMatch(/AI Analyst/);
  });
});
