// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const reactCompiler = require('eslint-plugin-react-compiler');

/**
 * Disallows inline arrow/anonymous functions as the first argument to useEffect.
 * Every effect callback must be a named function reference so effects are
 * identifiable, extractable, and easy to test in isolation.
 *
 * ✗  useEffect(() => { ... }, [dep])
 * ✗  useEffect(function() { ... }, [dep])
 * ✓  useEffect(loadData, [dep])       ← named function defined in scope
 * ✓  function loadData() { ... }      ← extracted above the component
 */
const noInlineUseEffect = {
  meta: { type: 'suggestion', fixable: null },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useEffect' &&
          node.arguments.length > 0 &&
          (node.arguments[0].type === 'ArrowFunctionExpression' ||
            node.arguments[0].type === 'FunctionExpression')
        ) {
          context.report({
            node: node.arguments[0],
            message:
              'useEffect callbacks must be extracted as named functions, not written inline. ' +
              'Define a named function (e.g. `function loadData() {}`) and pass it as a reference.',
          });
        }
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
    plugins: { local: { rules: { 'no-inline-use-effect': noInlineUseEffect } } },
    rules: { 'local/no-inline-use-effect': 'error' },
  },
]);
