import { zipSync } from 'fflate';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = Object.fromEntries(walk('dist').map(f => [relative('dist', f).replaceAll('\\', '/'), readFileSync(f)]));
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
mkdirSync('dist-zip', { recursive: true });
const out = `dist-zip/slashy-v${version}.zip`;
writeFileSync(out, zipSync(files));
console.log('wrote', out);
