// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const reactCompiler = require('eslint-plugin-react-compiler');

/**
 * Resolves the name of the nearest enclosing function for a given node by
 * walking up the parent chain. Handles:
 *   function foo() {}               → "foo"
 *   const foo = function() {}       → "foo"
 *   const foo = () => {}            → "foo"
 *   export default function() {}    → null
 */
function enclosingFunctionName(node) {
  let current = node.parent;
  while (current) {
    const t = current.type;
    if (t === 'FunctionDeclaration' || t === 'FunctionExpression' || t === 'ArrowFunctionExpression') {
      // Named function declaration or named function expression
      if (current.id?.name) return current.id.name;
      // Arrow or anonymous assigned to a variable: const foo = () => {}
      if (current.parent?.type === 'VariableDeclarator' && current.parent.id?.type === 'Identifier') {
        return current.parent.id.name;
      }
      return null; // Anonymous / unresolvable
    }
    current = current.parent;
  }
  return null;
}

/**
 * Disallows calling useEffect directly inside a component body.
 * Every useEffect must live inside a custom hook (a function named useXxx).
 *
 * ✗  function MyComponent() { useEffect(...) }
 * ✗  const MyComponent = () => { useEffect(...) }
 * ✓  function useMyHook() { useEffect(...) }
 * ✓  const useMyHook = () => { useEffect(...) }
 */
const useEffectInCustomHookOnly = {
  meta: { type: 'suggestion', fixable: null },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'useEffect') return;
        const name = enclosingFunctionName(node);
        if (name && /^use[A-Z]/.test(name)) return;
        context.report({
          node,
          message: `useEffect must be called inside a custom hook (useXxx), not in "${name ?? 'an anonymous function'}".`,
        });
      },
    };
  },
};

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  reactCompiler.configs.recommended,
  {
    ignores: ['dist/*'],
  },
  {
    plugins: { local: { rules: { 'use-effect-in-custom-hook-only': useEffectInCustomHookOnly } } },
    rules: { 'local/use-effect-in-custom-hook-only': 'error' },
  },
]);
