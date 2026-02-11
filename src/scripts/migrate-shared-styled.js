/**
 * Script para reemplazar styled-components locales con imports de shared/
 * Ejecutar: node src/scripts/migrate-shared-styled.js
 */
const fs = require('fs');
const path = require('path');

// Componentes compartidos por archivo de origen
const SHARED_COMPONENTS = {
  'ArtifactLayout.styled': ['Container', 'Header', 'HeaderTitle', 'HeaderDescription'],
  'LockSystem.styled': ['SubmissionBanner', 'SubmitButton', 'LockedMessage', 'LockIcon', 'LockText', 'UnlockButton'],
  'StatusMessages.styled': ['AutoSaveMessage', 'RestoreBanner', 'RestoreButton', 'PasteErrorMessage', 'ShortcutsHint'],
  'GuideSection.styled': ['GuideSection', 'GuideHeader', 'GuideTitle', 'ToggleIcon', 'GuideContent', 'GuideQuestions', 'GuideQuestion'],
  'FormComponents.styled': ['FormSection', 'SectionTitle', 'Label', 'Textarea', 'HintText', 'ValidationMessage', 'ButtonGroup', 'Button', 'PrimaryButton'],
  'FeedbackDisplay.styled': ['FeedbackSection', 'FeedbackHeader', 'NivelGlobal', 'DimensionLabel', 'CriteriosGrid', 'CriterioCard', 'CriterioHeader', 'CriterioTitle', 'CriterioNivel', 'ListSection', 'ListTitle', 'List', 'ListItem', 'LoadingSpinner', 'SpinnerIcon', 'LoadingText'],
  'CitasPanel.styled': ['CitasButton', 'CitasPanel', 'CitasPanelHeader', 'CitasList', 'CitaItem', 'CitaTexto', 'CitaFooter', 'CitaInfo', 'InsertarButton', 'EliminarButton', 'EmptyCitasMessage'],
};

// Flatten to single set
const ALL_SHARED = new Set();
Object.values(SHARED_COMPONENTS).forEach(arr => arr.forEach(c => ALL_SHARED.add(c)));

// Aliases por archivo (nombre local -> nombre exportado)
const ALIASES = {
  'TablaACD.js': { Title: 'HeaderTitle', Subtitle: 'HeaderDescription' },
  'MapaActores.js': { Title: 'HeaderTitle', Subtitle: 'HeaderDescription' },
  'RespuestaArgumentativa.js': { Title: 'HeaderTitle', Subtitle: 'HeaderDescription' },
  // ResumenAcademico ya usa HeaderTitle/HeaderDescription
  // BitacoraEticaIA ya usa HeaderTitle/HeaderDescription
};

// Equivalencias locales (nombre local que mapea a nombre compartido)
// Algunos archivos usan nombres ligeramente diferentes
const LOCAL_EQUIVALENTS = {
  'ResumenAcademico.js': {
    'GuideList': 'GuideQuestions',   // ResumenAcademico usa GuideList en vez de GuideQuestions
    'GuideItem': 'GuideQuestion',    // ResumenAcademico usa GuideItem en vez de GuideQuestion
  },
};

const ARTEFACTOS_DIR = path.join(__dirname, '..', 'components', 'artefactos');

const FILES = [
  'TablaACD.js',
  'MapaActores.js',
  'RespuestaArgumentativa.js',
  'ResumenAcademico.js',
  'BitacoraEticaIA.js',
];

function findStyledComponentBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Match: const ComponentName = styled.xxx` or const ComponentName = styled(xxx)`
    const match = line.match(/^const\s+(\w+)\s*=\s*styled(?:\.|\()/);
    if (match) {
      const name = match[1];
      const startLine = i;
      // Find the closing backtick+semicolon
      let endLine = i;
      let backtickCount = 0;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('`')) {
          backtickCount++;
          if (backtickCount >= 2) {
            endLine = j;
            // Check for semicolon on same or next line
            if (lines[j].trim().endsWith('`;')) {
              endLine = j;
            } else if (j + 1 < lines.length && lines[j + 1].trim() === ';') {
              endLine = j + 1;
            }
            break;
          }
        }
      }
      blocks.push({ name, startLine, endLine });
      i = endLine + 1;
    } else {
      i++;
    }
  }
  return blocks;
}

function processFile(filename) {
  const filePath = path.join(ARTEFACTOS_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const blocks = findStyledComponentBlocks(content);
  const aliases = ALIASES[filename] || {};
  const equivalents = LOCAL_EQUIVALENTS[filename] || {};
  
  // Build reverse map: local name -> shared name
  const reverseAliases = {};
  Object.entries(aliases).forEach(([local, shared]) => { reverseAliases[local] = shared; });
  
  // Determine which blocks to remove
  const blocksToRemove = [];
  const componentsToImport = new Set();
  const importAliases = {}; // sharedName -> localName (for aliased imports)
  
  for (const block of blocks) {
    const localName = block.name;
    
    // Check if this local name matches a shared component directly
    if (ALL_SHARED.has(localName)) {
      blocksToRemove.push(block);
      componentsToImport.add(localName);
    }
    // Check if there's an alias (e.g., Title -> HeaderTitle)
    else if (reverseAliases[localName]) {
      const sharedName = reverseAliases[localName];
      blocksToRemove.push(block);
      componentsToImport.add(sharedName);
      importAliases[sharedName] = localName;
    }
    // Check if there's a local equivalent (e.g., GuideList -> GuideQuestions)
    else if (equivalents[localName]) {
      const sharedName = equivalents[localName];
      blocksToRemove.push(block);
      componentsToImport.add(sharedName);
      importAliases[sharedName] = localName;
    }
  }

  // Remove blocks from bottom to top (to preserve line numbers)
  const sortedBlocks = [...blocksToRemove].sort((a, b) => b.startLine - a.startLine);
  for (const block of sortedBlocks) {
    // Also remove blank lines/comments above the block
    let removeStart = block.startLine;
    while (removeStart > 0 && (lines[removeStart - 1].trim() === '' || lines[removeStart - 1].trim().startsWith('//'))) {
      // Don't remove important comments that aren't just section dividers
      if (lines[removeStart - 1].trim().startsWith('//') && !lines[removeStart - 1].includes('===') && !lines[removeStart - 1].includes('🆕') && !lines[removeStart - 1].includes('Styled') && !lines[removeStart - 1].includes('styled') && !lines[removeStart - 1].includes('Componentes para')) {
        break;
      }
      removeStart--;
    }
    lines.splice(removeStart, block.endLine - removeStart + 1);
  }

  // Build import statement
  const importParts = [];
  const sortedImports = [...componentsToImport].sort();
  for (const sharedName of sortedImports) {
    if (importAliases[sharedName]) {
      importParts.push(`${sharedName} as ${importAliases[sharedName]}`);
    } else {
      importParts.push(sharedName);
    }
  }

  // Insert import after existing imports
  const importLine = `import { ${importParts.join(', ')} } from './shared';`;
  
  // Find the last import line
  let lastImportIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith("} from '") || lines[i].trim().startsWith("} from \"")) {
      lastImportIdx = i;
    }
  }
  
  // Insert after last import
  lines.splice(lastImportIdx + 1, 0, importLine);

  // Clean up multiple consecutive blank lines
  let cleaned = [];
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
  
  console.log(`\n✅ ${filename}:`);
  console.log(`   Removed: ${blocksToRemove.length} styled-component blocks`);
  console.log(`   Names: ${blocksToRemove.map(b => b.name).join(', ')}`);
  console.log(`   Import: ${importParts.length} components from ./shared`);
  
  const kept = blocks.filter(b => !blocksToRemove.includes(b)).map(b => b.name);
  if (kept.length > 0) {
    console.log(`   Kept local: ${kept.join(', ')}`);
  }
  
  return { removed: blocksToRemove.length, kept: kept.length, importCount: importParts.length };
}

// Run
console.log('🔄 Migrando styled-components a shared/...\n');
let totalRemoved = 0;
let totalKept = 0;

for (const file of FILES) {
  try {
    const result = processFile(file);
    totalRemoved += result.removed;
    totalKept += result.kept;
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
}

console.log(`\n📊 Total: ${totalRemoved} blocks removed, ${totalKept} kept local`);
