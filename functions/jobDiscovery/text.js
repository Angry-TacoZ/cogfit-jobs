const BLOCK_TAGS = /<\/?(?:address|article|br|div|h[1-6]|li|p|section|tr|ul|ol)\b[^>]*>/gi;
const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENTS = /<!--([\s\S]*?)-->/g;
const HTML_TAG_NAMES = 'a|abbr|address|article|aside|b|blockquote|br|button|caption|cite|code|col|colgroup|dd|del|details|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|i|img|input|ins|label|legend|li|main|mark|nav|ol|p|pre|script|section|small|span|strong|style|sub|sup|table|tbody|td|tfoot|th|thead|tr|u|ul';
const TAGS = new RegExp(`<\\/?(?:${HTML_TAG_NAMES})\\b[^>]*>`, 'gi');
const ENCODED_MARKUP_TAGS = new RegExp(`&(?:amp;)?lt;(\\/?)(${HTML_TAG_NAMES})\\b([\\s\\S]*?)&(?:amp;)?gt;`, 'gi');

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

function htmlToText(value, { decodeEncodedMarkup = false, entityDecodePasses = 1 } = {}) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const html = decodeEncodedMarkup
    ? value.replace(ENCODED_MARKUP_TAGS, '<$1$2$3>')
    : value;
  return html
    .replace(COMMENTS, '')
    .replace(SCRIPT_OR_STYLE, '')
    .replace(BLOCK_TAGS, '\n')
    .replace(TAGS, '')
    .split('\n')
    .map((line) => {
      let text = line.replace(/\s+/g, ' ').trim();
      for (let pass = 0; pass < entityDecodePasses; pass += 1) text = decodeEntities(text);
      return text.trim();
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeWorkplaceType(value) {
  if (typeof value !== 'string') return null;
  const workplaceType = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['remote', 'hybrid', 'onsite'].includes(workplaceType)) return workplaceType;
  if (['unknown', 'unspecified'].includes(workplaceType)) return 'unknown';
  return null;
}

function inferRemoteStatus(location, title = '') {
  const locationText = typeof location === 'string' ? location.trim() : '';
  const titleText = typeof title === 'string' ? title.trim() : '';
  const arrangementLabel = /(?:^|[,(|:\u2013\u2014-])\s*(remote|hybrid|on[ -]?site)\s*(?=$|[),|:\u2013\u2014-])/i;
  const workArrangementPhrase = /^(remote|hybrid)\s+(?:work|role|position)\b/i;
  for (const value of [locationText, titleText]) {
    const label = value.match(arrangementLabel)?.[1]?.toLowerCase().replace(/[ -]/g, '');
    if (label === 'remote' || label === 'hybrid') return label;
    if (label === 'onsite') return 'onsite';
    const phrase = value.match(workArrangementPhrase)?.[1]?.toLowerCase();
    if (phrase) return phrase;
  }
  if (!locationText || ['unknown', 'multiple locations'].includes(locationText.toLowerCase())) return 'unknown';
  return 'unknown';
}

module.exports = { htmlToText, inferRemoteStatus, normalizeWorkplaceType };
