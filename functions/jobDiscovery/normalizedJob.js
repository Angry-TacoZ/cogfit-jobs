const { createHash } = require('node:crypto');

const SOURCE_PLATFORMS = Object.freeze(['greenhouse', 'lever', 'ashby']);
const REMOTE_STATUSES = Object.freeze(['remote', 'hybrid', 'onsite', 'unknown']);

class NormalizedJobValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NormalizedJobValidationError';
  }
}

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new NormalizedJobValidationError(`${field} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new NormalizedJobValidationError(`${field} exceeds ${maxLength} characters`);
  }
  return text;
}

function optionalText(value, field, maxLength) {
  if (value === null || value === undefined || value === '') return null;
  return requiredText(value, field, maxLength);
}

function normalizedUrl(value, field) {
  const text = requiredText(value, field, 2000);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new NormalizedJobValidationError(`${field} must be a valid external URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new NormalizedJobValidationError(`${field} must use http or https`);
  }
  return url.toString();
}

function normalizedDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new NormalizedJobValidationError('datePosted must be a valid date');
  }
  return date.toISOString();
}

function canonicalContent(job) {
  return {
    applyUrl: job.applyUrl,
    companyIdentifier: job.companyIdentifier,
    companyName: job.companyName,
    department: job.department,
    description: job.description,
    employmentType: job.employmentType,
    externalJobId: job.externalJobId,
    location: job.location,
    remoteStatus: job.remoteStatus,
    sourcePlatform: job.sourcePlatform,
    sourceUrl: job.sourceUrl,
    title: job.title
  };
}

function createContentHash(job) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalContent(job)), 'utf8')
    .digest('hex');
}

function createNormalizedJob(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NormalizedJobValidationError('Normalized job must be an object');
  }

  const sourcePlatform = requiredText(value.sourcePlatform, 'sourcePlatform', 30).toLowerCase();
  if (!SOURCE_PLATFORMS.includes(sourcePlatform)) {
    throw new NormalizedJobValidationError('sourcePlatform is not supported');
  }

  const remoteStatus = (value.remoteStatus || 'unknown').toLowerCase();
  if (!REMOTE_STATUSES.includes(remoteStatus)) {
    throw new NormalizedJobValidationError('remoteStatus is not supported');
  }

  const companyIdentifier = requiredText(value.companyIdentifier, 'companyIdentifier', 100);
  if (!/^[A-Za-z0-9_-]+$/.test(companyIdentifier)) {
    throw new NormalizedJobValidationError('companyIdentifier contains unsupported characters');
  }

  const job = {
    sourcePlatform,
    companyName: requiredText(value.companyName, 'companyName', 200),
    companyIdentifier,
    externalJobId: requiredText(String(value.externalJobId ?? ''), 'externalJobId', 300),
    title: requiredText(value.title, 'title', 500),
    location: optionalText(value.location, 'location', 500) || 'Unknown',
    remoteStatus,
    employmentType: optionalText(value.employmentType, 'employmentType', 200),
    department: optionalText(value.department, 'department', 300),
    description: optionalText(value.description, 'description', 200000) || '',
    applyUrl: normalizedUrl(value.applyUrl, 'applyUrl'),
    sourceUrl: normalizedUrl(value.sourceUrl, 'sourceUrl'),
    datePosted: normalizedDate(value.datePosted)
  };

  return { ...job, contentHash: createContentHash(job) };
}

module.exports = {
  NormalizedJobValidationError,
  REMOTE_STATUSES,
  SOURCE_PLATFORMS,
  createContentHash,
  createNormalizedJob
};
