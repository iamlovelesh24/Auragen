// Compiles each .tsx in a folder, renders it to HTML, reports pass/fail as JSON.
import { build } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] || '.');
const tmp = path.join(here, '.render_tmp');
fs.mkdirSync(tmp, { recursive: true });

const noop = () => {};
const props = { onNext: noop, onBack: noop, onChange: noop, onSubmit: noop, onSelect: noop };

const results = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
  const entry = { file, compiled: false, rendered: false, error: null };
  try {
    const out = path.join(tmp, file.replace('.tsx', '.mjs'));
    await build({
      entryPoints: [path.join(dir, file)],
      outfile: out,
      bundle: true,
      format: 'esm',
      jsx: 'automatic',
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      logLevel: 'silent',
    });
    entry.compiled = true;
    const mod = await import(pathToFileURL(out).href + '?t=' + Date.now());
    const html = renderToString(React.createElement(mod.default, props));
    entry.rendered = html.length > 0;
    entry.htmlLength = html.length;
    entry.hasInteractive = /<(input|select|button|textarea)/i.test(html);
  } catch (err) {
    entry.error = String(err.message || err).split('\n')[0];
  }
  results.push(entry);
}
console.log(JSON.stringify(results, null, 2));
const ok = results.filter((r) => r.rendered).length;
console.error(`\n${ok}/${results.length} components compiled and rendered`);
