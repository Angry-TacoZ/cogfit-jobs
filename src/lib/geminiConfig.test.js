import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildGeminiJsonConfig } = require('../../functions/geminiConfig.js');

describe('Gemini 3.6 request configuration', () => {
  it('uses JSON output controls without unsupported sampling parameters', () => {
    const schema = { type: 'object', properties: { score: { type: 'number' } } };
    const config = buildGeminiJsonConfig({
      maxOutputTokens: 800,
      schema,
      schemaMode: 'schema'
    });

    expect(config).toEqual({
      responseMimeType: 'application/json',
      maxOutputTokens: 800,
      responseSchema: schema
    });
    expect(config).not.toHaveProperty('temperature');
    expect(config).not.toHaveProperty('topP');
    expect(config).not.toHaveProperty('topK');

    expect(buildGeminiJsonConfig({ maxOutputTokens: 600, schemaMode: 'plain' })).toEqual({
      responseMimeType: 'application/json',
      maxOutputTokens: 600
    });
  });
});
