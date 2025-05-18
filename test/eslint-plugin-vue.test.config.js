import exportRestrictPlugin from "../dist/esm/index.js";
import typescriptESLintParser from "@typescript-eslint/parser";
import vueEslintParser from "vue-eslint-parser";

export default [
  {
    files: ["**/*.js", "**/*.ts", "**/*.vue"],
    plugins: {
      "export-restrict": exportRestrictPlugin,
    },
    rules: {
      "export-restrict/no-export-private-declare": ["error"],
    },
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: typescriptESLintParser,
        extraFileExtensions: [".vue"],
      },
    },
  },
];
