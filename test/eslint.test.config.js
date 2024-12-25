const exportRestrictPlugin = require('eslint-plugin-export-restrict');

module.exports = [
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
