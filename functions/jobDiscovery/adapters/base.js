class AdapterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdapterError';
  }
}

function normalizeCompany(company) {
  if (!company || typeof company !== 'object') {
    throw new AdapterError('Company configuration is required');
  }
  const companyName = typeof company.companyName === 'string' ? company.companyName.trim() : '';
  const companyIdentifier = typeof company.companyIdentifier === 'string'
    ? company.companyIdentifier.trim()
    : '';
  if (!companyName || !companyIdentifier) {
    throw new AdapterError('Company name and identifier are required');
  }
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(companyIdentifier)) {
    throw new AdapterError('Company identifier contains unsupported characters');
  }
  return { companyName, companyIdentifier };
}

function malformedListingWarning(index, error) {
  const detail = error instanceof Error ? error.message : String(error);
  return `Skipped malformed listing at index ${index}: ${detail}`;
}

function normalizeListings(items, normalizeListing) {
  const jobs = [];
  const warnings = [];
  items.forEach((item, index) => {
    try {
      jobs.push(normalizeListing(item));
    } catch (error) {
      warnings.push(malformedListingWarning(index, error));
    }
  });
  return { jobs, warnings };
}

module.exports = { AdapterError, malformedListingWarning, normalizeCompany, normalizeListings };
