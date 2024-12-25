import exportRestrictPlugin from 'eslint-plugin-export-restrict';

export default [
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      'export-restrict': exportRestrictPlugin,
    },
    rules: {
      'export-restrict/no-export-private-declare': ['error'],
    },
  },
];
