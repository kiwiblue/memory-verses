// Runs before every build (npm's "prebuild" lifecycle hook) so public/version.json
// always matches src/data/version.js — this is what the running app polls to detect
// that a newer build has been deployed (PWAs saved to the home screen have no
// browser chrome to hard-refresh from otherwise).
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/version.js', import.meta.url), 'utf8');
const match = src.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!match) throw new Error('Could not find APP_VERSION in src/data/version.js');

writeFileSync(
  new URL('../public/version.json', import.meta.url),
  JSON.stringify({ version: match[1] }) + '\n'
);
