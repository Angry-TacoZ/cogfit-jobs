const { createNormalizedJob } = require('../normalizedJob');
const { htmlToText, inferRemoteStatus, normalizeWorkplaceType } = require('../text');
const { AdapterError, normalizeCompany, normalizeListings } = require('./base');

function ashbyEndpoint(companyIdentifier) {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companyIdentifier)}`;
}

function ashbyExternalJobId(item) {
  if (item.id !== null && item.id !== undefined && String(item.id).trim()) return item.id;
  if (typeof item.jobUrl !== 'string') return item.id;
  try {
    const url = new URL(item.jobUrl);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts.at(-1) || null;
  } catch {
    return null;
  }
}

function normalizeAshbyPayload(company, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.jobs)) {
    throw new AdapterError('Ashby response did not contain a jobs list');
  }
  const normalizedCompany = normalizeCompany(company);
  return normalizeListings(payload.jobs, (item) => {
    if (!item || typeof item !== 'object') throw new AdapterError('Listing must be an object');
    const location = typeof item.location === 'string' && item.location.trim() ? item.location : 'Unknown';
    const remoteStatus = normalizeWorkplaceType(item.workplaceType)
      || (item.isRemote === true ? 'remote' : inferRemoteStatus(location, item.title));
    return createNormalizedJob({
      sourcePlatform: 'ashby',
      ...normalizedCompany,
      externalJobId: ashbyExternalJobId(item),
      title: item.title,
      location,
      remoteStatus,
      employmentType: item.employmentType,
      department: item.department || item.team,
      description: typeof item.descriptionPlain === 'string' && item.descriptionPlain.trim()
        ? item.descriptionPlain
        : htmlToText(item.descriptionHtml),
      applyUrl: item.applyUrl,
      sourceUrl: item.jobUrl,
      datePosted: item.publishedAt
    });
  });
}

module.exports = { ashbyEndpoint, normalizeAshbyPayload };
