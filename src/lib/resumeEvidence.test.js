import { describe, expect, it } from 'vitest';
import { buildResumeBaselineProfile, buildResumeSeedAnswers, extractResumeEvidence } from './resumeEvidence';

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
});
