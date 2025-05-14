const exportRestrictPlugin = require('eslint-plugin-export-restrict');
const typescriptESLintParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      'export-restrict': exportRestrictPlugin,
    },
    rules: {
      'export-restrict/no-export-private-declare': ['error'],
    },
    languageOptions: {
      parser: typescriptESLintParser,
    },
  },
];
