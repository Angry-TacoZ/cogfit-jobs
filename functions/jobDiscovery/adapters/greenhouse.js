const { createNormalizedJob } = require('../normalizedJob');
const { htmlToText, inferRemoteStatus } = require('../text');
const { AdapterError, normalizeCompany, normalizeListings } = require('./base');

function greenhouseEndpoint(companyIdentifier) {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companyIdentifier)}/jobs?content=true`;
}

function normalizeGreenhousePayload(company, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.jobs)) {
    throw new AdapterError('Greenhouse response did not contain a jobs list');
  }
  const normalizedCompany = normalizeCompany(company);
  return normalizeListings(payload.jobs, (item) => {
    if (!item || typeof item !== 'object') throw new AdapterError('Listing must be an object');
    const location = typeof item.location?.name === 'string' && item.location.name.trim()
      ? item.location.name
      : 'Unknown';
    const department = Array.isArray(item.departments)
      ? item.departments.map((entry) => typeof entry?.name === 'string' ? entry.name.trim() : '')
        .filter(Boolean).join(', ') || null
      : null;
    return createNormalizedJob({
      sourcePlatform: 'greenhouse',
      ...normalizedCompany,
      externalJobId: item.id,
      title: item.title,
      location,
      remoteStatus: inferRemoteStatus(location, item.title),
      department,
      description: htmlToText(item.content),
      applyUrl: item.absolute_url,
      sourceUrl: item.absolute_url,
      datePosted: item.updated_at
    });
  });
}

module.exports = { greenhouseEndpoint, normalizeGreenhousePayload };
