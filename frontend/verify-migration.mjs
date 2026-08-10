/**
 * Post-migration verification script
 * Run this after all agents complete to do a final cleanup check
 * Usage: node verify-migration.js (from frontend/)
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const srcDir = './src';

function walkDir(dir, results = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkDir(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

const allFiles = walkDir(srcDir);
const tsFiles = allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
const jsFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
const cssFiles = allFiles.filter(f => f.endsWith('.css'));

console.log('\n=== MIGRATION VERIFICATION ===\n');
console.log(`✅ JS/JSX files: ${jsFiles.length}`);
console.log(`✅ CSS files: ${cssFiles.length}`);

if (tsFiles.length > 0) {
  console.log(`\n❌ TS/TSX files still remaining (${tsFiles.length}):`);
  tsFiles.forEach(f => console.log('  - ' + f.replace(srcDir, '')));
} else {
  console.log('\n✅ No TypeScript files remaining!');
}

console.log('\n=== JS/JSX File List ===');
jsFiles.sort().forEach(f => console.log('  ' + f.replace(srcDir, '')));
