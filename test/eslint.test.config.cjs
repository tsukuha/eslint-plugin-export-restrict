const exportRestrictPlugin = require("../dist/cjs/index.cjs");
const typescriptESLintParser = require("@typescript-eslint/parser");

module.exports = [
  {
    files: ["**/*.js", "**/*.ts"],
    plugins: {
      "export-restrict": exportRestrictPlugin,
    },
    rules: {
      "export-restrict/no-export-private-declare": ["error"],
    },
    languageOptions: {
      parser: typescriptESLintParser,
    },
  },
];
