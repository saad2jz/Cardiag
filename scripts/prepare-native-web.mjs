import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'www');

// Garde-fou : ce script ne doit jamais nettoyer autre chose que <projet>/www.
if (outputDir !== join(projectRoot, 'www')) {
  throw new Error('Destination native invalide.');
}

const files = ['index.html', 'manifest.json', 'sw.js', 'build-data.js', 'firebase-config.json', 'privacy.html', 'terms.html', 'account-deletion.html', 'shared-report.html'];
const directories = ['css', 'data', 'icons', 'js', 'vendor'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of files) {
  await cp(join(projectRoot, file), join(outputDir, file));
}

for (const directory of directories) {
  await cp(join(projectRoot, directory), join(outputDir, directory), { recursive: true });
}

console.log('Ressources natives préparées dans www/.');
