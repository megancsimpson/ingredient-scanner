// ESLint checks the code for common mistakes (unused variables, variables
// that don't exist, unreachable code, ...). Run it with `npm run lint`.
// The rules are ESLint's recommended set: https://eslint.org/docs/latest/rules
const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      // The server uses require() and module.exports, and runs on Node
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // An argument starting with _ is unused on purpose (e.g. Express
      // error handlers must take four arguments)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files run in Jest, which provides test(), expect(), jest.mock()
    // and so on without importing them
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
]);
