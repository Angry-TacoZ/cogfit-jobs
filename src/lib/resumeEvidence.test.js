import { describe, expect, it } from 'vitest';
import {
  assertResumeFileSize,
  buildResumeBaselineProfile,
  buildResumeSeedAnswers,
  countUsableResumeEvidence,
  extractResumeEvidence,
  hasUsableResumeEvidence
} from './resumeEvidence';

const resumeText = `
James Lane
AI Systems and Automation Builder
Built React, Vite, Firebase Hosting and Functions apps with server-side Gemini calls.
Created SQL and Power BI dashboards, Python document tooling, and API integrations.
Administered Active Directory, Microsoft 365, ServiceNow, Oracle E-Business Suite access, and FACETS workflows.
Maintained audit-ready documentation and governance-aware AI pilot materials for healthcare claims operations.
`;

describe('resume evidence extraction', () => {
  it('preserves enterprise, BI, ERP, and AI workflow evidence from resume text', () => {
    const evidence = extractResumeEvidence(resumeText);

    expect(evidence.tools).toEqual(expect.arrayContaining([
      'React',
      'Firebase',
      'SQL',
      'Power BI',
      'Oracle E-Business Suite',
      'ERP systems',
      'FACETS'
    ]));
    expect(evidence.evidence).toEqual(expect.arrayContaining([
      'workflow automation',
      'dashboarding and BI',
      'enterprise systems support',
      'governance and compliance-aware work'
    ]));
  });

  it('builds profile seed answers and a baseline profile without claiming workstyle certainty', () => {
    const evidence = extractResumeEvidence(resumeText);
    const answers = buildResumeSeedAnswers(evidence);
    const profile = buildResumeBaselineProfile(evidence);

    expect(answers.q6).toMatch(/Oracle E-Business Suite/);
    expect(profile.tools_and_skills).toEqual(expect.arrayContaining(['Power BI', 'ERP systems']));
    expect(profile.missing_information).toEqual(expect.arrayContaining([
      'work that energizes or drains the user',
      'negative-fit job history'
    ]));
    expect(profile.confidence_score).toBeLessThan(80);
  });

  it('rejects long input that contains no usable resume evidence', () => {
    const unsupportedText = 'Experienced professional with excellent communication and consistently strong performance. '.repeat(8);
    const evidence = extractResumeEvidence(unsupportedText);

    expect(unsupportedText.length).toBeGreaterThan(400);
    expect(countUsableResumeEvidence(evidence)).toBe(0);
    expect(hasUsableResumeEvidence(evidence)).toBe(false);
  });

  it('accepts a resume after extracting multiple usable evidence signals', () => {
    const evidence = extractResumeEvidence(resumeText);

    expect(countUsableResumeEvidence(evidence)).toBeGreaterThanOrEqual(3);
    expect(hasUsableResumeEvidence(evidence)).toBe(true);
  });

  it('redacts contact details from retained resume sentences', () => {
    const evidence = extractResumeEvidence(`
      Built a SQL dashboard at https://portfolio.example.com and automated reporting workflows; contact james@example.com or (717) 555-0199 at 123 Market Street for project details.
    `);
    const retainedText = [...evidence.projects, ...evidence.systemsEvidence].join(' ');

    expect(retainedText).toContain('[redacted URL]');
    expect(retainedText).toContain('[redacted email]');
    expect(retainedText).toContain('[redacted phone]');
    expect(retainedText).toContain('[redacted address]');
    expect(retainedText).not.toContain('portfolio.example.com');
    expect(retainedText).not.toContain('james@example.com');
    expect(retainedText).not.toContain('717');
    expect(retainedText).not.toContain('123 Market Street');
  });

  it('rejects resume files larger than 5 MB before reading them', () => {
    expect(() => assertResumeFileSize({ size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => assertResumeFileSize({ size: 5 * 1024 * 1024 + 1 }))
      .toThrow('Resume files must be 5 MB or smaller.');
  });
});
