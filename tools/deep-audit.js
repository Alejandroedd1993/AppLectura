const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcRoot = path.join(root, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(path.normalize(full));
  }
  return out;
}

const allFiles = walk(srcRoot);
const fileSet = new Set(allFiles);

function resolveBase(base) {
  const candidates = [base, base+'.js', base+'.jsx', path.join(base,'index.js'), path.join(base,'index.jsx')]
    .map(p => path.normalize(p));
  return candidates.find(c => fileSet.has(c)) || null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('.')) return resolveBase(path.resolve(path.dirname(fromFile), spec));
  if (spec.startsWith('src/')) return resolveBase(path.join(root, spec));
  if (spec.startsWith('@/')) return resolveBase(path.join(srcRoot, spec.slice(2)));
  return null;
}

// Build graph
const importRegex = /(?:import\s+(?:[^'"()]+\s+from\s+)?|export\s+[^'"()]*from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

const graph = new Map(allFiles.map(f => [f, []]));
const fileContents = new Map();
for (const file of allFiles) {
  const text = fs.readFileSync(file, 'utf8');
  fileContents.set(file, text);
  const specs = [];
  importRegex.lastIndex = 0;
  let m;
  while ((m = importRegex.exec(text)) !== null) specs.push(m[1]);
  requireRegex.lastIndex = 0;
  while ((m = requireRegex.exec(text)) !== null) specs.push(m[1]);
  const edges = [];
  for (const s of specs) {
    const t = resolveImport(file, s);
    if (t) edges.push(t);
  }
  graph.set(file, edges);
}

// Reachability from index.js
const entry = path.normalize(path.join(srcRoot, 'index.js'));
const reachable = new Set();
const stack = [entry];
while (stack.length) {
  const f = stack.pop();
  if (!f || reachable.has(f) || !graph.has(f)) continue;
  reachable.add(f);
  for (const n of graph.get(f)) stack.push(n);
}

const rel = p => path.relative(root, p).replace(/\\/g, '/');

// Categorize unreachable
const unreachable = allFiles.filter(f => !reachable.has(f));
const infraFiles = new Set();
const testFiles = new Set();
const prodUnreachable = [];

for (const f of unreachable) {
  const r = rel(f);
  if (r.includes('/__tests__/') || r.includes('/__mocks__/') || /\.test\.(js|jsx)$/.test(r)) {
    testFiles.add(r);
  } else if (r === 'src/setupProxy.js' || r === 'src/setupTests.js' || r.includes('/scripts/')) {
    infraFiles.add(r);
  } else {
    prodUnreachable.push(r);
  }
}

// For each unreachable prod file, search ALL files in src for any textual reference 
// (not just import - could be string refs, comments pointing to usage, etc.)
const deepRefs = {};
for (const ur of prodUnreachable) {
  const basename = path.basename(ur, path.extname(ur));
  // Search all reachable files for references to this basename
  const refs = [];
  for (const [file, text] of fileContents.entries()) {
    if (rel(file) === ur) continue; // skip self
    // Check for the basename as a word boundary match
    const regex = new RegExp('\\b' + basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (regex.test(text)) {
      const isReach = reachable.has(file);
      refs.push({ file: rel(file), reachable: isReach });
    }
  }
  const reachableRefs = refs.filter(r => r.reachable);
  if (reachableRefs.length > 0) {
    deepRefs[ur] = reachableRefs.map(r => r.file);
  }
}

// Output
console.log('=== REACHABILITY SUMMARY ===');
console.log('Total src files: ' + allFiles.length);
console.log('Reachable from index.js: ' + reachable.size);
console.log('Unreachable total: ' + unreachable.length);
console.log('  - Test/mock files: ' + testFiles.size);
console.log('  - Infra files (setupProxy, scripts): ' + infraFiles.size);
console.log('  - Prod candidates: ' + prodUnreachable.length);
console.log('');

console.log('=== FILES UNREACHABLE BUT REFERENCED FROM REACHABLE CODE ===');
console.log('(These may be used via dynamic patterns not caught by static import analysis)');
const referencedButUnreachable = Object.keys(deepRefs);
console.log('Count: ' + referencedButUnreachable.length);
for (const ur of referencedButUnreachable.sort()) {
  console.log('  ' + ur);
  for (const ref of deepRefs[ur].slice(0, 5)) {
    console.log('    <- ' + ref);
  }
}

console.log('');
console.log('=== FILES TRULY UNREACHABLE (no refs from reachable code) ===');
const trulyDead = prodUnreachable.filter(ur => !deepRefs[ur]);
console.log('Count: ' + trulyDead.length);
for (const f of trulyDead.sort()) {
  console.log('  ' + f);
}
