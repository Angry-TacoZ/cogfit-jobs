function extractJsonObject(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    return candidate;
  }

  const start = candidate.indexOf('{');
  if (start === -1) {
    throw new Error('Gemini response did not contain a JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{') {
      depth += 1;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, index + 1);
      }
    }
  }

  throw new Error('Gemini response contained incomplete JSON.');
}

function getGeminiResponseText(response) {
  if (typeof response?.text === 'string') {
    return response.text;
  }
  if (typeof response?.text === 'function') {
    const textResult = response.text();
    if (typeof textResult === 'string') {
      return textResult;
    }
  }

  const candidateText = response?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join('\n');

  return candidateText || '';
}

function getGeminiResponseDiagnostics(response) {
  const usage = response?.usageMetadata || {};
  return {
    finishReason: response?.candidates?.[0]?.finishReason || null,
    usage: {
      promptTokenCount: usage.promptTokenCount ?? null,
      candidatesTokenCount: usage.candidatesTokenCount ?? null,
      thoughtsTokenCount: usage.thoughtsTokenCount ?? null,
      totalTokenCount: usage.totalTokenCount ?? null
    }
  };
}

function markGeminiOutputError(error, reason) {
  error.isGeminiOutputError = true;
  error.geminiOutputReason = reason;
  return error;
}

function summarizeGeminiError(error) {
  if (error?.isGeminiOutputError === true) {
    return {
      name: error?.name,
      isGeminiOutputError: true,
      reason: error?.geminiOutputReason || 'invalid_json'
    };
  }

  return {
    name: error?.name,
    status: error?.status,
    code: error?.code,
    isGeminiOutputError: false,
    message: String(error?.message || '').slice(0, 500)
  };
}

function isRetryableGeminiError(error) {
  const status = Number(error?.status);
  const message = String(error?.message || '').toLowerCase();
  return error?.isGeminiOutputError === true
    || status === 429
    || status >= 500
    || message.includes('unavailable')
    || message.includes('high demand');
}

function parseGeminiJson(response, outputLabel = 'JSON response') {
  const text = getGeminiResponseText(response);
  if (!text) {
    throw markGeminiOutputError(
      new Error(`Gemini response did not include output text for ${outputLabel}.`),
      'empty_output'
    );
  }

  try {
    return JSON.parse(extractJsonObject(text));
  } catch (error) {
    const reason = error.message === 'Gemini response contained incomplete JSON.'
      ? 'incomplete_json'
      : error.message === 'Gemini response did not contain a JSON object.'
        ? 'missing_json_object'
        : 'invalid_json';
    throw markGeminiOutputError(error, reason);
  }
}

module.exports = {
  getGeminiResponseDiagnostics,
  getGeminiResponseText,
  isRetryableGeminiError,
  parseGeminiJson,
  summarizeGeminiError
};
