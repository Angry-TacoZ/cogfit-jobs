const { createNormalizedJob } = require('../normalizedJob');
const { inferRemoteStatus } = require('../text');
const { AdapterError, normalizeCompany, normalizeListings } = require('./base');

function leverEndpoint(companyIdentifier) {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(companyIdentifier)}?mode=json`;
}

function normalizeLeverPayload(company, payload) {
  if (!Array.isArray(payload)) {
    throw new AdapterError('Lever response was not a list');
  }
  const normalizedCompany = normalizeCompany(company);
  return normalizeListings(payload, (item) => {
    if (!item || typeof item !== 'object') throw new AdapterError('Listing must be an object');
    const categories = item.categories && typeof item.categories === 'object' ? item.categories : {};
    const location = typeof categories.location === 'string' && categories.location.trim()
      ? categories.location
      : 'Unknown';
    const department = typeof categories.team === 'string' && categories.team.trim()
      ? categories.team
      : typeof categories.department === 'string' && categories.department.trim()
        ? categories.department
        : null;
    const description = [item.descriptionPlain, item.additionalPlain]
      .filter((part) => typeof part === 'string' && part.trim())
      .join('\n');
    return createNormalizedJob({
      sourcePlatform: 'lever',
      ...normalizedCompany,
      externalJobId: item.id,
      title: item.text,
      location,
      remoteStatus: inferRemoteStatus(location, item.text),
      employmentType: categories.commitment,
      department,
      description,
      applyUrl: item.applyUrl,
      sourceUrl: item.hostedUrl,
      datePosted: Number.isFinite(item.createdAt) ? new Date(item.createdAt).toISOString() : null
    });
  });
}

module.exports = { leverEndpoint, normalizeLeverPayload };
