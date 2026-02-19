#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRS = new Set([
  'node_modules',
  'build',
  'dist',
  'coverage',
  '.git',
  '__mocks__',
  '__tests__'
]);

const PATTERNS = [
  {
    rule: 'fetch-relative-api',
    regex: /\b(?:fetch|fetchWithTimeout|fetchWithRetry)\s*\(\s*['"`]\s*\/api\//,
    message: 'Relative /api call in fetch-like function'
  },
  {
    rule: 'axios-relative-api',
    regex: /\baxios(?:\.(?:get|post|put|patch|delete|request|head|options))?\s*\(\s*['"`]\s*\/api\//,
    message: 'Relative /api call in axios'
  },
  {
    rule: 'request-relative-api',
    regex: /\bnew\s+Request\s*\(\s*['"`]\s*\/api\//,
    message: 'Relative /api call in Request constructor'
  }
];

function shouldIgnoreFile(relativePath) {
  return relativePath.includes('.test.') || relativePath.includes('.spec.');
}

function walkFiles(directory, collected = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, collected);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(extension)) continue;

    const relativePath = path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
    if (shouldIgnoreFile(relativePath)) continue;
    collected.push({ absolutePath, relativePath });
  }

  return collected;
}

function scanFile(file) {
  const findings = [];
  const content = fs.readFileSync(file.absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of PATTERNS) {
      if (!pattern.regex.test(line)) continue;
      findings.push({
        file: file.relativePath,
        line: index + 1,
        rule: pattern.rule,
        message: pattern.message,
        snippet: line.trim()
      });
    }
  }

  return findings;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('[check:no-relative-api] Missing src directory.');
    process.exit(2);
  }

  const files = walkFiles(SRC_DIR);
  const findings = files.flatMap(scanFile);

  if (findings.length === 0) {
    console.log('[check:no-relative-api] OK: no relative /api calls found in frontend runtime code.');
    return;
  }

  console.error('[check:no-relative-api] Relative /api calls detected. Use BACKEND_URL/getBackendUrl/buildBackendEndpoint.');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    console.error(`  ${finding.snippet}`);
  }
  process.exit(1);
}

main();
