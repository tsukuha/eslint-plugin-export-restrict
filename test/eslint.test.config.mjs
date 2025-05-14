import exportRestrictPlugin from '../dist/esm/index.mjs';
import typescriptESLintParser from '@typescript-eslint/parser';

export default [
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
