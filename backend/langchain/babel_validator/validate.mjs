#!/usr/bin/env node
// babel_validator/validate.mjs
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const ALLOWED_IMPORT_SOURCES = new Set([
  'react',
  'react-dom',
  '@/design-system', // TODO: point this at your real design-system import path
]);

const DISALLOWED_GLOBALS = new Set(['eval', 'require', 'importScripts']);

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

const out = (valid, stage, errors = [], securityFlags = []) =>
  console.log(JSON.stringify({ valid, stage, errors, securityFlags }));

async function main() {
  const code = await readStdin();
  if (!code.trim()) return out(false, 'input', [{ message: 'Empty input' }]);

  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (err) {
    return out(false, 'syntax', [{
      message: err.message, line: err.loc?.line ?? null, column: err.loc?.column ?? null,
    }]);
  }

  const flags = [];
  let hasDefaultExport = false;

  traverse(ast, {
    ExportDefaultDeclaration() { hasDefaultExport = true; },

    ImportDeclaration(path) {
      const src = path.node.source.value;
      if (!ALLOWED_IMPORT_SOURCES.has(src) && !src.startsWith('./') && !src.startsWith('../')) {
        flags.push({ type: 'disallowed_import', detail: src, line: path.node.loc?.start.line });
      }
    },

    CallExpression(path) {
      const callee = path.node.callee;
      const name = callee.type === 'Identifier' ? callee.name : null;
      if (name && DISALLOWED_GLOBALS.has(name)) {
        flags.push({ type: 'disallowed_call', detail: name, line: path.node.loc?.start.line });
      }
      if (name === 'fetch') {
        flags.push({ type: 'network_call', detail: 'fetch', line: path.node.loc?.start.line });
      }
      if ((name === 'setTimeout' || name === 'setInterval') &&
          path.node.arguments[0]?.type === 'StringLiteral') {
        flags.push({ type: 'string_eval', detail: name, line: path.node.loc?.start.line });
      }
    },

    NewExpression(path) {
      const name = path.node.callee.type === 'Identifier' ? path.node.callee.name : null;
      if (name === 'Function' || name === 'XMLHttpRequest') {
        flags.push({ type: 'disallowed_new', detail: name, line: path.node.loc?.start.line });
      }
    },

    JSXAttribute(path) {
      if (path.node.name.name === 'dangerouslySetInnerHTML') {
        flags.push({ type: 'dangerouslySetInnerHTML', line: path.node.loc?.start.line });
      }
    },

    JSXOpeningElement(path) {
      const name = path.node.name.name;
      if (['script', 'iframe', 'object', 'embed'].includes(name)) {
        flags.push({ type: 'disallowed_element', detail: name, line: path.node.loc?.start.line });
      }
    },

    MemberExpression(path) {
      const { object: obj, property: prop } = path.node;
      if (obj.type === 'Identifier' && obj.name === 'document' &&
          prop.type === 'Identifier' && ['cookie', 'write'].includes(prop.name)) {
        flags.push({ type: 'disallowed_document_access', detail: prop.name, line: path.node.loc?.start.line });
      }
    },
  });

  if (!hasDefaultExport) flags.push({ type: 'contract_violation', detail: 'missing default export' });

  out(flags.length === 0, flags.length === 0 ? 'ok' : 'security', [], flags);
}

main().catch((err) => out(false, 'internal', [{ message: err.message }]));