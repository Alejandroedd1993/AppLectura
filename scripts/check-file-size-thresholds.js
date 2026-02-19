#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const BASELINE_PATH = path.join(PROJECT_ROOT, 'scripts', 'file-size-baseline.json');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'build',
  'dist',
  'coverage',
  '__tests__',
  '__mocks__'
]);

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Missing baseline file: ${BASELINE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function shouldIgnoreFile(relativePath) {
  return relativePath.includes('.test.') || relativePath.includes('.spec.');
}

function collectSourceFiles(directory, collected = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolutePath, collected);
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

function countLines(absolutePath) {
  const content = fs.readFileSync(absolutePath, 'utf8');
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('[check:file-size] Missing src directory.');
    process.exit(2);
  }

  const baseline = readBaseline();
  const defaultMax = Number(baseline.defaultMaxLines || 1200);
  const maxByFile = baseline.maxLinesByFile || {};

  const files = collectSourceFiles(SRC_DIR);
  const violations = [];
  const allSizes = [];

  for (const file of files) {
    const lines = countLines(file.absolutePath);
    const allowedMax = Number(maxByFile[file.relativePath] || defaultMax);
    allSizes.push({ file: file.relativePath, lines, allowedMax });

    if (lines > allowedMax) {
      violations.push({ file: file.relativePath, lines, allowedMax });
    }
  }

  if (violations.length > 0) {
    console.error('[check:file-size] File size threshold violations found:');
    for (const violation of violations.sort((a, b) => b.lines - a.lines)) {
      console.error(`- ${violation.file}: ${violation.lines} lines (max ${violation.allowedMax})`);
    }
    process.exit(1);
  }

  const topLargest = allSizes
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 8)
    .map(item => `${item.file}=${item.lines}`)
    .join(', ');

  console.log(`[check:file-size] OK: ${allSizes.length} files checked. Largest files: ${topLargest}`);
}

main();

