import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(projectRoot, 'public');

// Vercel's Express runtime serves static assets from public/ through its CDN.
// Keep the generated directory out of Git and never clean outside the project.
if (outputDir !== join(projectRoot, 'public')) {
  throw new Error('Destination Vercel invalide.');
}

const files = [
  'index.html',
  '404.html',
  'manifest.json',
  'sw.js',
  'build-data.js',
  'firebase-config.json',
  'robots.txt',
  'sitemap.xml',
  'privacy.html',
  'terms.html',
  'account-deletion.html',
  'shared-report.html',
  'garage-admin.html',
  'garage-directory.html',
  'garage-registration.html',
];
const directories = ['assets', 'css', 'data', 'icons', 'js', 'vendor'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of files) {
  await cp(join(projectRoot, file), join(outputDir, file));
}

for (const directory of directories) {
  await cp(join(projectRoot, directory), join(outputDir, directory), { recursive: true });
}

console.log('Ressources web Vercel préparées dans public/.');
