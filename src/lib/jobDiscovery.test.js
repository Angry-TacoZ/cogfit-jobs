import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createNormalizedJob } = require('../../functions/jobDiscovery/normalizedJob.js');
const { htmlToText, inferRemoteStatus } = require('../../functions/jobDiscovery/text.js');
const { normalizeGreenhousePayload } = require('../../functions/jobDiscovery/adapters/greenhouse.js');
const { normalizeLeverPayload } = require('../../functions/jobDiscovery/adapters/lever.js');
const { normalizeAshbyPayload } = require('../../functions/jobDiscovery/adapters/ashby.js');

function fixture(name) {
  return JSON.parse(readFileSync(new URL(`../../functions/jobDiscovery/__fixtures__/${name}`, import.meta.url), 'utf8'));
}

const company = { companyName: 'Example Company', companyIdentifier: 'example' };

describe('job discovery adapters', () => {
  it('normalizes a Greenhouse payload and skips an invalid individual listing', () => {
    const result = normalizeGreenhousePayload(company, fixture('greenhouse.json'));

    expect(result.jobs).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('applyUrl must use http or https');
    expect(result.jobs[0]).toMatchObject({
      sourcePlatform: 'greenhouse',
      externalJobId: '101',
      title: 'AI Operations Analyst',
      location: 'Remote - US',
      remoteStatus: 'remote',
      department: 'Operations',
      applyUrl: 'https://boards.greenhouse.io/example/jobs/101'
    });
    expect(result.jobs[0].description).toBe('Build workflow automation and documentation.');
    expect(result.jobs[0].description).not.toContain('alert');
  });

  it('normalizes a Lever payload and preserves the ATS apply destination', () => {
    const result = normalizeLeverPayload(company, fixture('lever.json'));

    expect(result.jobs).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      sourcePlatform: 'lever',
      externalJobId: 'lever-201',
      title: 'Business Systems Analyst',
      remoteStatus: 'onsite',
      employmentType: 'Full-time',
      department: 'Internal Tools',
      applyUrl: 'https://jobs.lever.co/example/lever-201/apply'
    });
    expect(result.jobs[0].description).toContain('Low direct customer contact.');
  });

  it('normalizes an Ashby payload and honors its explicit remote flag', () => {
    const result = normalizeAshbyPayload(company, fixture('ashby.json'));

    expect(result.jobs).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      sourcePlatform: 'ashby',
      externalJobId: 'ashby-301',
      title: 'AI Evaluation Coordinator',
      remoteStatus: 'remote',
      employmentType: 'FullTime',
      department: 'Responsible AI',
      applyUrl: 'https://jobs.ashbyhq.com/example/ashby-301/application'
    });
  });
});

describe('job discovery text normalization', () => {
  it('converts HTML into safe readable text without executing or retaining tags', () => {
    expect(htmlToText('<h2>Role</h2><p>Build &amp; test <em>systems</em>.</p><style>bad</style>'))
      .toBe('Role\nBuild & test systems.');
  });

  it.each([
    ['Remote, United States', 'Engineer', 'remote'],
    ['New York, NY', 'Hybrid Data Analyst', 'hybrid'],
    ['Pittsburgh, PA', 'Systems Analyst', 'onsite'],
    ['Unknown', 'Systems Analyst', 'unknown'],
    ['Multiple locations', 'Systems Analyst', 'unknown']
  ])('infers %s as %s', (location, title, expected) => {
    expect(inferRemoteStatus(location, title)).toBe(expected);
  });
});

describe('normalized job content hashes', () => {
  const input = {
    sourcePlatform: 'greenhouse',
    companyName: 'Example Company',
    companyIdentifier: 'example',
    externalJobId: '101',
    title: 'AI Operations Analyst',
    location: 'Remote - US',
    remoteStatus: 'remote',
    employmentType: null,
    department: 'Operations',
    description: 'Build workflow automation.',
    applyUrl: 'https://boards.greenhouse.io/example/jobs/101',
    sourceUrl: 'https://boards.greenhouse.io/example/jobs/101',
    datePosted: '2026-07-10T12:00:00Z'
  };

  it('is stable for identical logical content and ignores volatile posting date metadata', () => {
    const first = createNormalizedJob(input);
    const second = createNormalizedJob({ ...input, datePosted: '2026-08-10T12:00:00Z' });

    expect(first.contentHash).toBe(second.contentHash);
  });

  it('changes when meaningful job content changes', () => {
    const first = createNormalizedJob(input);
    const changed = createNormalizedJob({ ...input, description: 'Build workflow automation and data products.' });

    expect(first.contentHash).not.toBe(changed.contentHash);
  });
});
