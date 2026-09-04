const { createNormalizedJob } = require('../normalizedJob');
const { htmlToText, inferRemoteStatus } = require('../text');
const { AdapterError, normalizeCompany, normalizeListings } = require('./base');

function ashbyEndpoint(companyIdentifier) {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companyIdentifier)}`;
}

function normalizeAshbyPayload(company, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.jobs)) {
    throw new AdapterError('Ashby response did not contain a jobs list');
  }
  const normalizedCompany = normalizeCompany(company);
  return normalizeListings(payload.jobs, (item) => {
    if (!item || typeof item !== 'object') throw new AdapterError('Listing must be an object');
    const location = typeof item.location === 'string' && item.location.trim() ? item.location : 'Unknown';
    return createNormalizedJob({
      sourcePlatform: 'ashby',
      ...normalizedCompany,
      externalJobId: item.id,
      title: item.title,
      location,
      remoteStatus: item.isRemote === true ? 'remote' : inferRemoteStatus(location, item.title),
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
