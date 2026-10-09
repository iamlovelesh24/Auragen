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

const DISALLOWED_GLOBALS = new Set(['eval', 'require', 'importScripts', 'Function']);

// Browser APIs a generated component must never reference (network, storage, navigation).
const FORBIDDEN_GLOBAL_NAMES = new Set([
  'eval', 'require', 'importScripts',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker',
  'localStorage', 'sessionStorage', 'indexedDB', 'location',
]);

const WINDOW_LIKE = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'frames']);
const FORBIDDEN_WINDOW_PROPS = new Set([...FORBIDDEN_GLOBAL_NAMES, 'open', 'postMessage']);
const FORBIDDEN_DOCUMENT_PROPS = new Set(['cookie', 'write', 'writeln', 'domain', 'location']);
const FORBIDDEN_NAVIGATOR_PROPS = new Set(['sendBeacon']);
const FORBIDDEN_HTML_SINKS = new Set(['innerHTML', 'outerHTML']);

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

// Property name of a member expression, or null if it cannot be known statically.
function propName(node) {
  const p = node.property;
  if (!node.computed && p.type === 'Identifier') return p.name;
  if (node.computed && p.type === 'StringLiteral') return p.value;
  if (node.computed && p.type === 'TemplateLiteral' && p.expressions.length === 0) {
    return p.quasis[0].value.cooked;
  }
  return null;
}

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
  const flag = (type, detail, node) =>
    flags.push({ type, detail, line: node?.loc?.start.line });
  let hasDefaultExport = false;

  traverse(ast, {
    // Version-agnostic: depending on @babel/parser version, dynamic import() is either
    // CallExpression{callee: Import} or a separate ImportExpression node. Catch both.
    enter(path) {
      const t = path.node.type;
      if (t === 'ImportExpression' || t === 'Import') {
        flag('dynamic_import', 'import()', path.node);
      }
    },

    ExportDefaultDeclaration() { hasDefaultExport = true; },

    ImportDeclaration(path) {
      const src = path.node.source.value;
      if (!ALLOWED_IMPORT_SOURCES.has(src) && !src.startsWith('./') && !src.startsWith('../')) {
        flags.push({ type: 'disallowed_import', detail: src, line: path.node.loc?.start.line });
      }
    },

    // Any reference to a forbidden global that is not a local variable.
    Identifier(path) {
      const name = path.node.name;
      if (!FORBIDDEN_GLOBAL_NAMES.has(name)) return;
      if (!path.isReferencedIdentifier()) return;
      if (path.scope.getBinding(name)) return; // locally declared, not the global
      flag('forbidden_global', name, path.node);
    },

    CallExpression(path) {
      const callee = path.node.callee;

      const name = callee.type === 'Identifier' ? callee.name : null;
      if (name && DISALLOWED_GLOBALS.has(name)) {
        flag('disallowed_call', name, path.node);
      }
      if (name === 'fetch') {
        flag('network_call', 'fetch', path.node);
      }
      if ((name === 'setTimeout' || name === 'setInterval') &&
          path.node.arguments[0]?.type === 'StringLiteral') {
        flag('string_eval', name, path.node);
      }

      // el.insertAdjacentHTML(...)
      if (callee.type === 'MemberExpression' && propName(callee) === 'insertAdjacentHTML') {
        flag('html_sink', 'insertAdjacentHTML', path.node);
      }
    },

    NewExpression(path) {
      const name = path.node.callee.type === 'Identifier' ? path.node.callee.name : null;
      if (name === 'Function' || name === 'XMLHttpRequest' || name === 'WebSocket' ||
          name === 'EventSource' || name === 'Worker' || name === 'SharedWorker') {
        flag('disallowed_new', name, path.node);
      }
    },

    AssignmentExpression(path) {
      const left = path.node.left;
      // el.innerHTML = ... / el.outerHTML = ...
      if (left.type === 'MemberExpression') {
        const p = propName(left);
        if (p && FORBIDDEN_HTML_SINKS.has(p)) flag('html_sink', p, path.node);
      }
      // location = "https://..."
      if (left.type === 'Identifier' && left.name === 'location' &&
          !path.scope.getBinding('location')) {
        flag('navigation', 'location', path.node);
      }
    },

    // const { fetch } = window;   const w = window;
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!init || init.type !== 'Identifier' || path.scope.getBinding(init.name)) return;
      const isWin = WINDOW_LIKE.has(init.name);
      const isDoc = init.name === 'document';
      const isNav = init.name === 'navigator';
      if (!isWin && !isDoc && !isNav) return;

      if (id.type === 'Identifier' && isWin) {
        flag('global_alias', init.name, path.node);
      }
      if (id.type === 'ObjectPattern') {
        const set = isWin ? FORBIDDEN_WINDOW_PROPS : isDoc ? FORBIDDEN_DOCUMENT_PROPS : FORBIDDEN_NAVIGATOR_PROPS;
        for (const prop of id.properties) {
          if (prop.type === 'RestElement') { flag('global_destructure', 'rest', path.node); continue; }
          const key = prop.key?.name ?? prop.key?.value;
          if (key && set.has(key)) flag('global_destructure', key, path.node);
        }
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
        flag('disallowed_element', name, path.node);
      }
    },

    'MemberExpression|OptionalMemberExpression'(path) {
      const { object: obj } = path.node;
      if (obj.type !== 'Identifier' || path.scope.getBinding(obj.name)) return;
      const p = propName(path.node);

      if (WINDOW_LIKE.has(obj.name)) {
        if (p === null) return flag('computed_global_access', obj.name + '[...]', path.node);
        if (FORBIDDEN_WINDOW_PROPS.has(p)) flag('disallowed_global_access', `${obj.name}.${p}`, path.node);
      } else if (obj.name === 'document') {
        if (p && FORBIDDEN_DOCUMENT_PROPS.has(p)) flag('disallowed_document_access', p, path.node);
      } else if (obj.name === 'navigator') {
        if (p && FORBIDDEN_NAVIGATOR_PROPS.has(p)) flag('disallowed_navigator_access', p, path.node);
      }
    },
  });

  if (!hasDefaultExport) flags.push({ type: 'contract_violation', detail: 'missing default export' });

  out(flags.length === 0, flags.length === 0 ? 'ok' : 'security', [], flags);
}

main().catch((err) => out(false, 'internal', [{ message: err.message }]));