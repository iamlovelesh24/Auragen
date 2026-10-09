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

// A generated form component has no business referencing these globals AT ALL.
const FORBIDDEN_UNBOUND_NAMES = new Set([
  ...FORBIDDEN_GLOBAL_NAMES,
  'Function',
  'window', 'globalThis', 'self', 'top', 'parent', 'frames', 'opener',
  'document', 'navigator', 'history',
  'Reflect', 'Image', 'Audio',
  'open', 'postMessage',
]);

// Properties that lead back to window / Function / prototypes.
const BANNED_PROPERTY_NAMES = new Set([
  'constructor', '__proto__', 'prototype',
  '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
  'defaultView', 'ownerDocument', 'contentWindow', 'contentDocument', 'parentWindow',
]);

const DANGEROUS_TAGS = new Set(['script', 'iframe', 'object', 'embed']);
const EXTERNAL_URL_ATTRS = new Set(['src', 'href', 'action', 'formAction', 'poster', 'srcSet', 'ping']);
const EXTERNAL_URL = /^\s*(https?:)?\/\//i;
const DANGEROUS_URL = /^(javascript:|vbscript:|data:text\/html)/i;

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

// Constant-fold an expression to a string when it is built only from literals and
// const variables that hold literals ("con" + "structor", `${a}b`, const k = "x"; obj[k]).
function staticString(node, scope, depth = 0) {
  if (!node || depth > 8) return null;
  switch (node.type) {
    case 'StringLiteral':
      return node.value;
    case 'NumericLiteral':
      return String(node.value);
    case 'TemplateLiteral': {
      let s = '';
      for (let i = 0; i < node.quasis.length; i++) {
        const cooked = node.quasis[i].value.cooked;
        if (cooked == null) return null;
        s += cooked;
        if (i < node.expressions.length) {
          const e = staticString(node.expressions[i], scope, depth + 1);
          if (e === null) return null;
          s += e;
        }
      }
      return s;
    }
    case 'BinaryExpression': {
      if (node.operator !== '+') return null;
      const l = staticString(node.left, scope, depth + 1);
      const r = staticString(node.right, scope, depth + 1);
      return l === null || r === null ? null : l + r;
    }
    case 'Identifier': {
      const b = scope && scope.getBinding(node.name);
      if (b && b.constant && b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier') {
        return staticString(b.path.node.init, b.path.scope, depth + 1);
      }
      return null;
    }
    default:
      return null;
  }
}

// Property name of a member expression, or null if it cannot be known statically.
function propName(node, scope) {
  const p = node.property;
  if (!node.computed) return p.type === 'Identifier' ? p.name : null;
  return staticString(p, scope);
}

const isDangerousUrl = (s) =>
  typeof s === 'string' && DANGEROUS_URL.test(s.replace(/[\u0000-\u0020\u007f-\u009f]/g, ''));

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
      if (!FORBIDDEN_UNBOUND_NAMES.has(name)) return;
      if (!path.isReferencedIdentifier()) return;
      if (path.scope.getBinding(name)) return; // locally declared, not the global
      // Names that only appear inside TypeScript types are erased at compile time.
      if (path.findParent((p) => p.isTSType() || p.isTSInterfaceDeclaration())) return;
      flag('forbidden_global', name, path.node);
    },

    // `this` is window in sloppy-mode functions; function components never need it.
    ThisExpression(path) {
      if (!path.findParent((p) => p.isClass())) flag('this_access', 'this', path.node);
    },

    StringLiteral(path) {
      if (isDangerousUrl(path.node.value)) {
        flag('dangerous_url', path.node.value.slice(0, 40), path.node);
      }
    },

    TemplateLiteral(path) {
      const first = path.node.quasis[0]?.value.cooked;
      if (first && isDangerousUrl(first)) flag('dangerous_url', first.slice(0, 40), path.node);
    },

    // { constructor: ... }, { innerHTML: "x" }, const { constructor } = x
    ObjectProperty(path) {
      const k = path.node.key;
      let name = null;
      if (!path.node.computed) {
        name = k.type === 'Identifier' ? k.name : k.type === 'StringLiteral' ? k.value : null;
      } else {
        name = staticString(k, path.scope);
      }
      if (name && (BANNED_PROPERTY_NAMES.has(name) || FORBIDDEN_HTML_SINKS.has(name))) {
        flag('forbidden_property', name, path.node);
      }
    },

    'CallExpression|OptionalCallExpression'(path) {
      const callee = path.node.callee;
      const args = path.node.arguments;

      const name = callee.type === 'Identifier' ? callee.name : null;
      if (name && DISALLOWED_GLOBALS.has(name)) {
        flag('disallowed_call', name, path.node);
      }
      if (name === 'fetch') {
        flag('network_call', 'fetch', path.node);
      }
      if ((name === 'setTimeout' || name === 'setInterval') &&
          (args[0]?.type === 'StringLiteral' || args[0]?.type === 'TemplateLiteral')) {
        flag('string_eval', name, path.node);
      }

      const isMember = callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression';
      const member = isMember ? propName(callee, path.scope) : null;

      // el.insertAdjacentHTML(...)
      if (member === 'insertAdjacentHTML') {
        flag('html_sink', 'insertAdjacentHTML', path.node);
      }
      // el.setAttribute("onclick", "...") / el.setAttribute("srcdoc", "...")
      if (member === 'setAttribute') {
        const a = staticString(args[0], path.scope);
        if (a && (/^on/i.test(a) || a.toLowerCase() === 'srcdoc')) {
          flag('html_sink', `setAttribute(${a})`, path.node);
        }
      }
      // React.createElement("script") / document.createElement("script")
      if (name === 'createElement' || member === 'createElement') {
        const tag = staticString(args[0], path.scope);
        if (tag && DANGEROUS_TAGS.has(tag.trim().toLowerCase())) {
          flag('disallowed_element', tag, path.node);
        }
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
        const p = propName(left, path.scope);
        if (p && FORBIDDEN_HTML_SINKS.has(p)) flag('html_sink', p, path.node);
      }
      // location = "https://..." / window = ...
      if (left.type === 'Identifier' && FORBIDDEN_UNBOUND_NAMES.has(left.name) &&
          !path.scope.getBinding(left.name)) {
        flag(left.name === 'location' ? 'navigation' : 'global_assign', left.name, path.node);
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
      const attr = path.node;
      const attrName = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
      if (attrName === 'dangerouslySetInnerHTML') {
        flags.push({ type: 'dangerouslySetInnerHTML', line: attr.loc?.start.line });
      }
      // External resources (exfiltration via <img src="https://evil/?d=...">)
      if (attrName && EXTERNAL_URL_ATTRS.has(attrName) && attr.value) {
        let v = null;
        if (attr.value.type === 'StringLiteral') {
          v = attr.value.value;
        } else if (attr.value.type === 'JSXExpressionContainer') {
          const e = attr.value.expression;
          v = e.type === 'TemplateLiteral'
            ? (e.quasis[0]?.value.cooked ?? null)
            : staticString(e, path.scope);
        }
        if (v && EXTERNAL_URL.test(v)) flag('external_resource', `${attrName}=${v.slice(0, 40)}`, attr);
      }
    },

    JSXOpeningElement(path) {
      const n = path.node.name;
      const name = n.type === 'JSXIdentifier' ? n.name : null;
      if (!name) return;
      if (DANGEROUS_TAGS.has(name)) {
        flag('disallowed_element', name, path.node);
        return;
      }
      // const Tag = "script"; <Tag />
      const s = staticString({ type: 'Identifier', name }, path.scope);
      if (s && DANGEROUS_TAGS.has(s.trim().toLowerCase())) {
        flag('disallowed_element', s, path.node);
      }
    },

    'MemberExpression|OptionalMemberExpression'(path) {
      const node = path.node;
      const p = propName(node, path.scope);

      // x.constructor, x.__proto__, e.target.ownerDocument.defaultView, ...
      if (p && BANNED_PROPERTY_NAMES.has(p)) flag('forbidden_property', p, node);

      const { object: obj } = node;
      if (obj.type !== 'Identifier' || path.scope.getBinding(obj.name)) return;

      if (WINDOW_LIKE.has(obj.name)) {
        if (p === null) return flag('computed_global_access', obj.name + '[...]', node);
        if (FORBIDDEN_WINDOW_PROPS.has(p)) flag('disallowed_global_access', `${obj.name}.${p}`, node);
      } else if (obj.name === 'document') {
        if (p && FORBIDDEN_DOCUMENT_PROPS.has(p)) flag('disallowed_document_access', p, node);
      } else if (obj.name === 'navigator') {
        if (p && FORBIDDEN_NAVIGATOR_PROPS.has(p)) flag('disallowed_navigator_access', p, node);
      }
    },
  });

  if (!hasDefaultExport) flags.push({ type: 'contract_violation', detail: 'missing default export' });

  out(flags.length === 0, flags.length === 0 ? 'ok' : 'security', [], flags);
}

main().catch((err) => out(false, 'internal', [{ message: err.message }]));