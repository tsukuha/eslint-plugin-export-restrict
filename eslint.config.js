const typescriptESLintParser = require('@typescript-eslint/parser') 
const typescriptESLintPlugin = require('@typescript-eslint/eslint-plugin')

module.exports =  [
  {
    files: ['**/*'],
    ignore: ["eslint.*"],
    rules: {
      semi: ['error', 'always'],
      'max-len': ['error', { code: 120 }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  {
    files: ['**/*.*ts'],
    languageOptions: {
      parser: typescriptESLintParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptESLintPlugin,
    },
    rules: {
      semi: ['error', 'always'],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'max-len': ['error', { code: 120 }],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
];
