const toolAliases = [
  ['Python', /\bpython\b/i],
  ['JavaScript', /\bjavascript\b|\bjs\b/i],
  ['TypeScript', /\btypescript\b|\bts\b/i],
  ['React', /\breact\b/i],
  ['Vite', /\bvite\b/i],
  ['Firebase', /\bfirebase\b/i],
  ['Firebase Functions', /\bfirebase (hosting\/)?functions\b|\bcloud functions\b/i],
  ['Cloudflare Workers', /\bcloudflare workers\b|\bwrangler\b/i],
  ['SQL', /\bsql\b/i],
  ['SQLite', /\bsqlite\b/i],
  ['Power BI', /\bpower bi\b/i],
  ['DAX', /\bdax\b/i],
  ['Microsoft 365', /\bmicrosoft 365\b|\bm365\b/i],
  ['Active Directory', /\bactive directory\b|\bazure ad\b|\bentra\b/i],
  ['ServiceNow', /\bservicenow\b/i],
  ['Oracle E-Business Suite', /\boracle e-business suite\b|\boracle ebs\b/i],
  ['ERP systems', /\berp\b|\boracle e-business suite\b|\bsap\b/i],
  ['FACETS', /\bfacets\b/i],
  ['APIs', /\bapi\b|\bapis\b|\bwebhook/i],
  ['LLM APIs', /\bopenai\b|\banthropic\b|\bgemini\b|\bllm api/i],
  ['PDF parsing', /\bpdf parsing\b|\bpdf parser\b|\bdocument parser/i],
  ['GitHub', /\bgithub\b|\bgit\b/i],
  ['Airtable', /\bairtable\b/i],
  ['Zapier', /\bzapier\b/i]
];

const evidenceAliases = [
  ['deployed apps', /\bdeployed\b|\bhosting\b|\blive route\b|\bweb\.app\b|\bspace\b/i],
  ['workflow automation', /\bworkflow\b|\bautomation\b|\bautomated\b|\bautomate\b/i],
  ['internal tools', /\binternal tool\b|\btooling\b|\bassistant\b|\bdashboard\b/i],
  ['dashboarding and BI', /\bdashboard\b|\bpower bi\b|\bbi\b|\breporting\b/i],
  ['enterprise systems support', /\benterprise\b|\bservicenow\b|\bactive directory\b|\boracle\b|\bfacets\b/i],
  ['governance and compliance-aware work', /\bgovernance\b|\bcompliance\b|\baudit\b|\bguardrail\b|\bphi\b|\bsecret scan\b/i],
  ['process documentation', /\bdocumentation\b|\bjob aid\b|\bdecision note\b|\btechnical writing\b/i],
  ['source-grounded AI patterns', /\bsource-grounded\b|\bretrieval\b|\brag\b|\bknowledge\b/i],
  ['quality and deployment checks', /\btest\b|\bvalidation\b|\bdeployment gate\b|\bsecret scan\b|\blive check\b/i],
  ['systems debugging', /\bdiagnose\b|\bdebug\b|\broot cause\b|\bfailure\b|\bincident\b/i]
];

const domainAliases = [
  ['enterprise IT', /\benterprise it\b|\bhelp desk\b|\bsystems support\b/i],
  ['healthcare operations', /\bhealthcare\b|\bclaims\b|\bphi\b|\bcapital blue cross\b|\bfacets\b/i],
  ['AI workflow automation', /\bai workflow\b|\bai systems\b|\bllm\b|\bassistant\b/i],
  ['internal operations', /\binternal workflow\b|\boperations\b|\bonboarding\b|\boffboarding\b/i],
  ['audit-adjacent governance', /\baudit\b|\bcompliance\b|\bgovernance\b|\bguardrails\b/i]
];

const titlePatterns = [
  /\bAI Consultant\b/gi,
  /\bClaims Examiner\b/gi,
  /\bHelp Desk Analyst\b/gi,
  /\bEnterprise Systems Support\b/gi,
  /\bSales and Device Support Associate\b/gi,
  /\bPC Technician\b/gi
];

const unique = (items, limit = 12) => {
  const seen = new Set();
  const values = [];
  for (const item of items) {
    const text = String(item || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    values.push(text);
    if (values.length >= limit) break;
  }
  return values;
};

function matchingLabels(text, aliases, limit) {
  return unique(
    aliases
      .filter(([, pattern]) => pattern.test(text))
      .map(([label]) => label),
    limit
  );
}

function sentenceMatches(text, patterns, limit = 8) {
  const sentences = String(text || '')
    .replace(/\r/g, '\n')
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line) => line.length > 28 && line.length < 280);

  return unique(sentences.filter((line) => patterns.some((pattern) => pattern.test(line))), limit);
}

export function extractResumeEvidence(resumeText) {
  const text = String(resumeText || '').split(String.fromCharCode(0)).join(' ').trim();
  const titleMatches = titlePatterns.flatMap((pattern) => text.match(pattern) || []);
  const tools = matchingLabels(text, toolAliases, 24);
  const evidence = matchingLabels(text, evidenceAliases, 16);
  const domains = matchingLabels(text, domainAliases, 12);
  const projects = sentenceMatches(text, [
    /\bbuilt\b/i,
    /\bdeployed\b/i,
    /\bcreated\b/i,
    /\bautomated\b/i,
    /\bdashboard\b/i,
    /\bpilot\b/i,
    /\bparser\b/i
  ], 10);
  const systemsEvidence = sentenceMatches(text, [
    /\bworkflow\b/i,
    /\bsystem\b/i,
    /\bprocess\b/i,
    /\broot cause\b/i,
    /\baudit\b/i,
    /\bgovernance\b/i,
    /\bcompliance\b/i
  ], 10);

  const evidenceDepth = tools.length + evidence.length + projects.length + systemsEvidence.length;

  return {
    importedAt: new Date().toISOString(),
    sourceType: 'resume',
    characterCount: text.length,
    tools,
    evidence,
    domains,
    titles: unique(titleMatches, 8),
    projects,
    systemsEvidence,
    confidence: Math.min(76, Math.max(42, 38 + evidenceDepth * 2))
  };
}

export function buildResumeSeedAnswers(evidence) {
  const projectEvidence = unique([...evidence.projects, ...evidence.evidence], 10).join('; ');
  return {
    q1: evidence.domains.includes('AI workflow automation')
      ? 'AI enablement, AI workflow automation, internal tools, product operations, solutions engineering.'
      : evidence.domains.join(', '),
    q4: projectEvidence || evidence.evidence.join(', '),
    q5: unique([...evidence.projects, ...evidence.evidence], 10).join(', '),
    q6: evidence.tools.join(', '),
    q7: 'Resume evidence may understate cross-functional systems work, implementation depth, and project evidence that does not map cleanly to legacy titles.',
    q16: unique(evidence.systemsEvidence, 5).join(' ')
  };
}

export function buildResumeBaselineProfile(evidence) {
  const systemsScore = evidence.systemsEvidence.length >= 4
    ? { root_cause_depth: 4, system_mapping: 5, pattern_recognition: 4, failure_mode_awareness: 4, improvement_drive: 4, abstraction_ability: 3 }
    : { root_cause_depth: 3, system_mapping: 3, pattern_recognition: 3, failure_mode_awareness: 3, improvement_drive: 3, abstraction_ability: 2 };

  return {
    target_role_families: evidence.domains.includes('AI workflow automation')
      ? ['AI enablement', 'AI workflow automation', 'internal tools', 'product operations', 'solutions engineering']
      : unique(evidence.domains, 8),
    strongest_evidence: unique([...evidence.projects, ...evidence.evidence], 10),
    tools_and_skills: unique(evidence.tools, 20),
    energizers: [],
    drainers: [],
    preferred_problem_structure: evidence.systemsEvidence.length
      ? 'Resume shows systems, workflow, and process evidence. Ask calibration questions to clarify preferred ambiguity and ownership level.'
      : 'Resume import created a baseline, but problem-structure preference still needs calibration.',
    communication_preferences: evidence.evidence.includes('process documentation') ? ['documentation', 'technical writing'] : [],
    interaction_limits: 'Not enough evidence from resume. Ask calibration questions about meetings, phone, camera, live customer, and support load.',
    autonomy_needs: 'Not enough evidence from resume. Ask calibration questions about ownership, structure, and decision rights.',
    negative_fit_patterns: [],
    hidden_costs: [],
    misunderstood_resume_signals: ['resume evidence may not reveal sustainable work style', 'title alignment may understate project evidence'],
    systems_thinking_score: systemsScore,
    confidence_score: evidence.confidence,
    missing_information: [
      'work that energizes or drains the user',
      'interaction and meeting load tolerance',
      'negative-fit job history',
      'salary, location, travel, and schedule constraints'
    ],
    inferred_flags: {
      likes_ambiguity: false,
      avoids_sales_pressure: false,
      prefers_async: evidence.evidence.includes('process documentation'),
      low_call_tolerance: false
    },
    profile_generation_mode: 'local_first_pass',
    live_profile_error: 'Resume-first baseline profile. Answer calibration questions to improve workstyle precision.'
  };
}
