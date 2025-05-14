const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat();
const typescriptESLintParser = require('@typescript-eslint/parser');

module.exports = [
  ...compat.plugins("export-restrict"),
  {
    files: ['**/*.js', '**/*.ts'],
    rules: {
      "export-restrict/no-export-private-declare": ["error"],
    },
    languageOptions: {
      parser: typescriptESLintParser,
    },
  },
];
