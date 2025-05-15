import typescriptESLintParser from "@typescript-eslint/parser";
import typescriptESLintPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*"],
    ignores: ["eslint.*", "dist/**/*"],
    rules: {
      semi: ["error", "always"],
      "max-len": ["error", { code: 120 }],
      "comma-dangle": ["error", "always-multiline"],
    },
  },
  {
    files: ["**/*.*ts"],
    ignores: ["eslint.*", "dist/**/*"],
    languageOptions: {
      parser: typescriptESLintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptESLintPlugin,
    },
    rules: {
      semi: ["error", "always"],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "max-len": ["error", { code: 120 }],
      "comma-dangle": ["error", "always-multiline"],
    },
  },
];
