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
      remoteStatus: 'unknown',
      employmentType: 'Full-time',
      department: 'Internal Tools',
      applyUrl: 'https://jobs.lever.co/example/lever-201/apply'
    });
    expect(result.jobs[0].description).toContain('Low direct customer contact.');
  });

  it('retains Lever list headings and HTML content in the description and content hash', () => {
    const listing = {
      ...fixture('lever.json')[0],
      lists: [{ text: 'Requirements', content: '<li>Five years of SQL</li><li>Daily phone support</li>' }]
    };
    const first = normalizeLeverPayload(company, [listing]).jobs[0];
    const changed = normalizeLeverPayload(company, [{
      ...listing,
      lists: [{ text: 'Requirements', content: '<li>Ten years of SQL</li><li>Daily phone support</li>' }]
    }]).jobs[0];

    expect(first.description).toContain('Requirements\nFive years of SQL\nDaily phone support');
    expect(first.contentHash).not.toBe(changed.contentHash);
  });

  it('isolates malformed optional Lever list sections', () => {
    const listing = {
      ...fixture('lever.json')[0],
      lists: [null, 'bad section', { text: 'Requirements', content: '<li>Five years of SQL</li>' }]
    };
    const result = normalizeLeverPayload(company, [listing]);

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].description).toContain('Five years of SQL');
    expect(result.warnings).toHaveLength(0);
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

  it('uses the Ashby posting URL as stable identity when the public payload has no id', () => {
    const listing = { ...fixture('ashby.json').jobs[0] };
    delete listing.id;
    const normalized = normalizeAshbyPayload(company, { jobs: [listing] }).jobs[0];
    const repeated = normalizeAshbyPayload(company, { jobs: [{ ...listing }] }).jobs[0];

    expect(normalized.externalJobId).toBe('ashby-301');
    expect(normalized.contentHash).toBe(repeated.contentHash);
  });

  it.each([
    ['lever', 'hybrid'],
    ['lever', 'REMOTE'],
    ['ashby', 'Hybrid'],
    ['ashby', 'Remote']
  ])('uses explicit %s workplace type %s ahead of location and fallback fields', (platform, workplaceType) => {
    const remoteStatus = platform === 'lever'
      ? normalizeLeverPayload(company, [{
        ...fixture('lever.json')[0], text: 'Engineer', categories: { location: 'New York, NY' }, workplaceType
      }]).jobs[0].remoteStatus
      : normalizeAshbyPayload(company, { jobs: [{
        ...fixture('ashby.json').jobs[0], title: 'Engineer', location: 'New York, NY',
        isRemote: workplaceType.toLowerCase() === 'remote', workplaceType
      }] }).jobs[0].remoteStatus;

    expect(remoteStatus).toBe(workplaceType.toLowerCase());
  });
});

describe('job discovery text normalization', () => {
  it('converts HTML into safe readable text without executing or retaining tags', () => {
    expect(htmlToText('<h2>Role</h2><p>Build &amp; test <em>systems</em>.</p><style>bad</style>'))
      .toBe('Role\nBuild & test systems.');
  });

  it('converts Greenhouse entity-encoded markup without dropping literal angle-bracket text', () => {
    const listing = {
      ...fixture('greenhouse.json').jobs[0],
      content: '&amp;lt;p&amp;gt;Build &amp;amp; test Queue&amp;lt;T&amp;gt; and compare x &amp;lt; y &amp;gt; z.&amp;lt;/p&amp;gt;&amp;lt;p&amp;gt;Second paragraph.&amp;lt;/p&amp;gt;&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;'
    };
    const normalized = normalizeGreenhousePayload(company, { jobs: [listing] }).jobs[0];

    expect(normalized.description).toBe('Build & test Queue<T> and compare x < y > z.\nSecond paragraph.');
    expect(normalized.description).not.toContain('alert');
  });

  it('preserves escaped literal angle brackets while removing actual markup', () => {
    const result = htmlToText('<p>Maintain Queue&lt;T&gt; and compare x &lt; y &gt; z.</p><script>alert(1)</script>');

    expect(result).toBe('Maintain Queue<T> and compare x < y > z.');
    expect(result).not.toContain('alert');
  });

  it.each([
    ['Remote, United States', 'Engineer', 'remote'],
    ['New York, NY (Hybrid)', 'Systems Analyst', 'hybrid'],
    ['Seattle, WA', 'Remote Sensing Engineer', 'unknown'],
    ['Seattle, WA', 'Hybrid Technology Engineer', 'unknown'],
    ['Seattle, WA', 'Engineer - Remote', 'remote'],
    ['Pittsburgh, PA', 'Systems Analyst', 'unknown'],
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
