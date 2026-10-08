// Load a dependency-free TypeScript module in plain Node by bundling it with esbuild
// (already installed via Vite). Used by tests/ and scripts/ so they share src/lib code.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadTs(entry) {
    const res = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, target: 'node20' });
    const file = join(mkdtempSync(join(tmpdir(), 'pg-ts-')), 'mod.mjs');
    writeFileSync(file, res.outputFiles[0].text);
    return import(pathToFileURL(file).href);
}
