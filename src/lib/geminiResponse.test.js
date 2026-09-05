import { describe, expect, it } from 'vitest';
import geminiResponse from '../../functions/geminiResponse.js';

const { getGeminiResponseDiagnostics, isRetryableGeminiError, parseGeminiJson } = geminiResponse;

describe('Gemini response handling', () => {
  it('parses a complete JSON report', () => {
    expect(parseGeminiJson({ text: '{"decision":"Apply"}' }, 'structured report')).toEqual({
      decision: 'Apply'
    });
  });

  it('marks truncated JSON as a retryable model-output failure', () => {
    expect.assertions(3);

    try {
      parseGeminiJson({ text: '{"decision":"App' }, 'structured report');
    } catch (error) {
      expect(error.message).toBe('Gemini response contained incomplete JSON.');
      expect(error.isGeminiOutputError).toBe(true);
      expect(isRetryableGeminiError(error)).toBe(true);
    }
  });

  it('does not retry ordinary client errors', () => {
    expect(isRetryableGeminiError({ status: 400, message: 'invalid request' })).toBe(false);
  });

  it('extracts only safe termination telemetry', () => {
    const response = {
      text: '{"private":"report text"}',
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'sensitive output' }] } }],
      usageMetadata: {
        promptTokenCount: 1200,
        candidatesTokenCount: 400,
        thoughtsTokenCount: 900,
        totalTokenCount: 2500
      }
    };

    expect(getGeminiResponseDiagnostics(response)).toEqual({
      finishReason: 'MAX_TOKENS',
      usage: {
        promptTokenCount: 1200,
        candidatesTokenCount: 400,
        thoughtsTokenCount: 900,
        totalTokenCount: 2500
      }
    });
    expect(JSON.stringify(getGeminiResponseDiagnostics(response))).not.toContain('sensitive output');
  });
});
