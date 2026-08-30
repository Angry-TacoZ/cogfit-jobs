function buildGeminiJsonConfig({ maxOutputTokens, schema, schemaMode }) {
  const config = {
    responseMimeType: 'application/json',
    maxOutputTokens
  };

  if (schemaMode === 'schema') {
    config.responseSchema = schema;
  }
  if (schemaMode === 'jsonSchema') {
    config.responseJsonSchema = schema;
  }

  return config;
}

module.exports = {
  buildGeminiJsonConfig
};
