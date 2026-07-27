import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_TARGETS = ['src', 'functions', 'public', 'index.html', 'vite.config.js', 'dist'];
const IGNORED_DIRECTORIES = new Set([
  '.firebase',
  '.git',
  '.npm-cache',
  'coverage',
  'node_modules'
]);
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
]);

const googleApiHeader = ['x', 'goog', 'api', 'key'].join('-');
const privateKeyMarker = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const googleCredentialsVariable = ['GOOGLE', 'APPLICATION', 'CREDENTIALS'].join('_');

const SENSITIVE_PATTERNS = [
  { name: 'Google API key', expression: /AIza[0-9A-Za-z_-]{20,}/g },
  {
    name: 'Direct Gemini API endpoint',
    expression: /generativelanguage\.googleapis\.com/gi
  },
  {
    name: 'Static Google API key header',
    expression: new RegExp(googleApiHeader, 'gi')
  },
  {
    name: 'Static bearer token',
    expression: /Authorization['"]?\s*:\s*['"]Bearer\s+[A-Za-z0-9._~+/=-]{20,}/gi
  },
  { name: 'OpenAI-style API key', expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: 'Anthropic API key', expression: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  {
    name: 'Private key block',
    expression: new RegExp(privateKeyMarker, 'g')
  },
  {
    name: 'Google application credentials path',
    expression: new RegExp(
      `${googleCredentialsVariable}\\s*[:=]\\s*['"]?[^\\s'"]+`,
      'g'
    )
  },
  {
    name: 'Public-build model API key',
    expression: /VITE_(?:GEMINI|OPENAI|ANTHROPIC)(?:_API)?_KEY\s*=\s*[^\r\n#]+/gi
  }
];

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

async function collectFiles(targetPath, files) {
  let targetStat;
  try {
    targetStat = await stat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  if (targetStat.isFile()) {
    if (targetStat.size <= MAX_FILE_BYTES && TEXT_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
      files.push(targetPath);
    }
    return;
  }

  if (!targetStat.isDirectory()) return;

  const entries = await readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    if (!entry.isDirectory() && !entry.isFile()) continue;
    await collectFiles(path.join(targetPath, entry.name), files);
  }
}

export async function scanPaths(targets, cwd = process.cwd()) {
  const files = [];
  for (const target of targets) {
    await collectFiles(path.resolve(cwd, target), files);
  }

  const findings = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const pattern of SENSITIVE_PATTERNS) {
      pattern.expression.lastIndex = 0;
      for (const match of content.matchAll(pattern.expression)) {
        findings.push({
          file: path.relative(cwd, file).replaceAll(path.sep, '/'),
          line: lineNumberAt(content, match.index),
          type: pattern.name
        });
      }
    }
  }

  return findings;
}

export function formatFindings(findings) {
  return findings
    .map(({ file, line, type }) => `${file}:${line} ${type}`)
    .join('\n');
}

async function main() {
  const targets = process.argv.slice(2);
  const findings = await scanPaths(targets.length > 0 ? targets : DEFAULT_TARGETS);

  if (findings.length > 0) {
    console.error('Public secret/API exposure scan failed.');
    console.error(formatFindings(findings));
    process.exitCode = 1;
    return;
  }

  console.log('Public secret/API exposure scan passed.');
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`Public secret/API exposure scan could not complete: ${error.message}`);
    process.exitCode = 1;
  });
}
