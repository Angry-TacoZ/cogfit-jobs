const BLOCK_TAGS = /<\/?(?:address|article|br|div|h[1-6]|li|p|section|tr|ul|ol)\b[^>]*>/gi;
const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENTS = /<!--([\s\S]*?)-->/g;
const TAGS = /<[^>]*>/g;

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"'
});

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (Object.hasOwn(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower];
    const codePoint = lower.startsWith('#x')
      ? Number.parseInt(lower.slice(2), 16)
      : lower.startsWith('#') ? Number.parseInt(lower.slice(1), 10) : Number.NaN;
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });
}

function htmlToText(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  return decodeEntities(value)
    .replace(COMMENTS, '')
    .replace(SCRIPT_OR_STYLE, '')
    .replace(BLOCK_TAGS, '\n')
    .replace(TAGS, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function inferRemoteStatus(location, title = '') {
  const locationText = typeof location === 'string' ? location.trim() : '';
  const value = `${locationText} ${typeof title === 'string' ? title : ''}`.toLowerCase();
  if (value.includes('hybrid')) return 'hybrid';
  if (value.includes('remote')) return 'remote';
  if (locationText && !['unknown', 'multiple locations'].includes(locationText.toLowerCase())) {
    return 'onsite';
  }
  return 'unknown';
}

module.exports = { htmlToText, inferRemoteStatus };
