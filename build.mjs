import { build, context } from 'esbuild';
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
rmSync('dist', { recursive: true, force: true });
cpSync('public', 'dist', { recursive: true });
// keep manifest version in lockstep with package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const mf = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
writeFileSync('dist/manifest.json', JSON.stringify({ ...mf, version: pkg.version }, null, 2));

const opts = {
  entryPoints: { background: 'src/background.ts', sidepanel: 'src/sidepanel/main.tsx', content: 'src/content.ts' },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  loader: { '.css': 'css' },
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  logLevel: 'info',
};
if (watch) await (await context(opts)).watch();
else await build(opts);
