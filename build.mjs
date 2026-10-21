// Builds the shipped artefact into dist/ (ADR 0003, 0018, 0030): one bundle per entry, the page, the Claude Code
// scripts, and the version of the root package.json in dist/VERSION.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const ENTRIES = {
  'server.js': 'packages/server/src/main.ts',
  'tracker.js': 'packages/cli/src/main.ts',
  'admin.js': 'packages/install/src/admin-main.ts',
  'install.js': 'packages/install/src/install-main.ts',
  'launcher.js': 'packages/launcher/src/main.ts',
  'hold.js': 'packages/launcher/src/hold-main.ts',
  'claude/session-start.js': 'packages/adapter-claude/src/session-start-main.ts',
  'claude/prompt-submit.js': 'packages/adapter-claude/src/prompt-submit-main.ts',
  'claude/stop.js': 'packages/adapter-claude/src/stop-main.ts',
};

// Bundled CommonJS dependencies call require(): give the ESM bundle one.
const banner =
  "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);";

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const [outfile, entry] of Object.entries(ENTRIES)) {
  await build({
    entryPoints: [entry],
    outfile: `dist/${outfile}`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22.13',
    banner: { js: banner },
    logLevel: 'warning',
  });
}
writeFileSync('dist/VERSION', `${version}\n`);

// The launch scripts go with the artefact: the front ones into each project, the back ones to the launcher
// (ADR 0046, 0052).
for (const script of ['start-front.sh', 'stop-front.sh', 'start-back.sh', 'stop-back.sh']) {
  cpSync(`scripts/${script}`, `dist/${script}`);
}
// The bundles are ES modules: said once, so that Node warns about nothing at start (ADR 0052).
writeFileSync('dist/package.json', `${JSON.stringify({ type: 'module' })}\n`);

// The plugin form of the adapter, for trials with --plugin-dir; installs use the project settings (ADR 0030).
cpSync('packages/adapter-claude/plugin', 'dist/claude-plugin', { recursive: true });
cpSync('dist/claude', 'dist/claude-plugin/scripts', { recursive: true });
