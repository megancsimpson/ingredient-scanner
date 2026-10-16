// ESLint checks the code for common mistakes (unused variables, missing
// React hook dependencies, imports that don't exist, ...). Run it with
// `npm run lint`. The rules come from Expo's recommended config:
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['dist/*']),
  expoConfig,
  {
    rules: {
      // This rule is written for websites, where a stray ' or " in text can
      // be confusing in HTML. React Native's <Text> shows them as they are,
      // and the app's messages use them a lot ("Couldn't", "Non
      // pore-clogging"), so only > and }, which are usually typos, are flagged.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },
  {
    // Test files run in Jest on Node, which provides test(), expect(),
    // jest.mock(), __dirname and so on without importing them
    files: ['__tests__/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
  },
]);
