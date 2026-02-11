/**
 * Script v2: Migrar styled-components locales a shared/
 * Usa un parser de backtick robusto que maneja ${} interpolations.
 */
const fs = require('fs');
const path = require('path');

const ALL_SHARED = new Set([
  'Container', 'Header', 'HeaderTitle', 'HeaderDescription',
  'SubmissionBanner', 'SubmitButton', 'LockedMessage', 'LockIcon', 'LockText', 'UnlockButton',
  'AutoSaveMessage', 'RestoreBanner', 'RestoreButton', 'PasteErrorMessage', 'ShortcutsHint',
  'GuideSection', 'GuideHeader', 'GuideTitle', 'ToggleIcon', 'GuideContent', 'GuideQuestions', 'GuideQuestion',
  'FormSection', 'SectionTitle', 'Label', 'Textarea', 'HintText', 'ValidationMessage', 'ButtonGroup', 'Button', 'PrimaryButton',
  'FeedbackSection', 'FeedbackHeader', 'NivelGlobal', 'DimensionLabel', 'CriteriosGrid', 'CriterioCard', 'CriterioHeader', 'CriterioTitle', 'CriterioNivel', 'ListSection', 'ListTitle', 'List', 'ListItem', 'LoadingSpinner', 'SpinnerIcon', 'LoadingText',
  'CitasButton', 'CitasPanel', 'CitasPanelHeader', 'CitasList', 'CitaItem', 'CitaTexto', 'CitaFooter', 'CitaInfo', 'InsertarButton', 'EliminarButton', 'EmptyCitasMessage',
]);

const ALIASES = {
  'TablaACD.js': { 'Title': 'HeaderTitle', 'Subtitle': 'HeaderDescription' },
  'MapaActores.js': { 'Title': 'HeaderTitle', 'Subtitle': 'HeaderDescription' },
  'RespuestaArgumentativa.js': { 'Title': 'HeaderTitle', 'Subtitle': 'HeaderDescription' },
};

const LOCAL_EQUIVALENTS = {
  'ResumenAcademico.js': { 'GuideList': 'GuideQuestions', 'GuideItem': 'GuideQuestion' },
};

/**
 * Find styled-component blocks using character-level backtick parsing.
 * Handles ${...} interpolations that may contain backticks inside strings.
 */
function findStyledBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^const\s+(\w+)\s*=\s*styled(?:\.|\()/);
    if (!match) continue;
    
    const name = match[1];
    const startLine = i;
    
    // Find the opening backtick on this or subsequent lines
    let openBacktickLine = -1;
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].includes('`')) {
        openBacktickLine = j;
        break;
      }
    }
    if (openBacktickLine === -1) continue;
    
    // Now find the CLOSING backtick by tracking brace depth for ${...}
    // We scan character by character from after the opening backtick
    let found = false;
    let inInterpolation = 0; // depth of ${} nesting
    let firstBacktickSeen = false;
    
    for (let j = openBacktickLine; j < lines.length && !found; j++) {
      const line = lines[j];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        
        if (!firstBacktickSeen) {
          if (ch === '`') {
            firstBacktickSeen = true;
          }
          continue;
        }
        
        // We're inside the template literal
        if (inInterpolation > 0) {
          if (ch === '{') inInterpolation++;
          else if (ch === '}') inInterpolation--;
          continue;
        }
        
        // Check for ${ start
        if (ch === '$' && c + 1 < line.length && line[c + 1] === '{') {
          inInterpolation = 1;
          c++; // skip the {
          continue;
        }
        
        // Closing backtick
        if (ch === '`') {
          // Find the end of this statement (handle `;` on same or next line)
          let endLine = j;
          const remaining = line.substring(c + 1).trim();
          if (remaining === '' && j + 1 < lines.length && lines[j + 1].trim() === ';') {
            endLine = j + 1;
          }
          blocks.push({ name, startLine, endLine });
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      console.warn(`⚠️  Could not find closing backtick for ${name} starting at line ${startLine + 1}`);
    }
  }
  
  return blocks;
}

function processFile(filename) {
  const filePath = path.join(__dirname, '..', 'components', 'artefactos', filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const blocks = findStyledBlocks(content);
  const aliases = ALIASES[filename] || {};
  const equivalents = LOCAL_EQUIVALENTS[filename] || {};
  
  // Reverse alias map: local name -> shared name
  const reverseAliases = {};
  Object.entries(aliases).forEach(([local, shared]) => { reverseAliases[local] = shared; });
  
  const blocksToRemove = [];
  const componentsToImport = new Set();
  const importAliases = {}; // sharedName -> localName
  
  for (const block of blocks) {
    const localName = block.name;
    if (ALL_SHARED.has(localName)) {
      blocksToRemove.push(block);
      componentsToImport.add(localName);
    } else if (reverseAliases[localName]) {
      const sharedName = reverseAliases[localName];
      blocksToRemove.push(block);
      componentsToImport.add(sharedName);
      importAliases[sharedName] = localName;
    } else if (equivalents[localName]) {
      const sharedName = equivalents[localName];
      blocksToRemove.push(block);
      componentsToImport.add(sharedName);
      importAliases[sharedName] = localName;
    }
  }
  
  // Remove blocks bottom-to-top
  const sorted = [...blocksToRemove].sort((a, b) => b.startLine - a.startLine);
  for (const block of sorted) {
    // Remove preceding blank lines and section-comment lines
    let removeStart = block.startLine;
    while (removeStart > 0) {
      const prev = lines[removeStart - 1].trim();
      if (prev === '' || prev.startsWith('// ===') || prev.startsWith('// 🆕') || prev.startsWith('// Styled') || prev.startsWith('// styled') || prev.startsWith('// Nuevos') || prev.startsWith('// Componentes para') || prev.startsWith('// STYLED')) {
        removeStart--;
      } else {
        break;
      }
    }
    const count = block.endLine - removeStart + 1;
    lines.splice(removeStart, count);
  }
  
  // Build import statement
  const importParts = [];
  for (const sharedName of [...componentsToImport].sort()) {
    if (importAliases[sharedName]) {
      importParts.push(`${sharedName} as ${importAliases[sharedName]}`);
    } else {
      importParts.push(sharedName);
    }
  }
  
  const importLine = `import {\n  ${importParts.join(',\n  ')}\n} from './shared';`;
  
  // Find last import line
  let lastImportIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith("} from '") || trimmed.startsWith("} from \"")) {
      lastImportIdx = i;
    }
  }
  lines.splice(lastImportIdx + 1, 0, importLine);
  
  // Clean up excessive blank lines (max 2 consecutive)
  const cleaned = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) cleaned.push(line);
    } else {
      blankCount = 0;
      cleaned.push(line);
    }
  }
  
  fs.writeFileSync(filePath, cleaned.join('\n'), 'utf8');
  
  const kept = blocks.filter(b => !blocksToRemove.includes(b)).map(b => b.name);
  console.log(`✅ ${filename}: removed ${blocksToRemove.length} blocks, kept ${kept.length} local`);
  if (kept.length > 0) console.log(`   Kept: ${kept.join(', ')}`);
  
  return { removed: blocksToRemove.length, kept: kept.length };
}

console.log('🔄 Migration v2...\n');
let totalR = 0, totalK = 0;
for (const f of ['TablaACD.js', 'MapaActores.js', 'RespuestaArgumentativa.js', 'ResumenAcademico.js', 'BitacoraEticaIA.js']) {
  try {
    const r = processFile(f);
    totalR += r.removed;
    totalK += r.kept;
  } catch (e) {
    console.error(`❌ ${f}: ${e.message}`);
  }
}
console.log(`\n📊 Total: ${totalR} removed, ${totalK} kept`);
