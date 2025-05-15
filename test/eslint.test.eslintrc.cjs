module.exports = {
  plugins: ["export-restrict"],
  overrides: [
    {
      files: ["**/*.js", "**/*.ts"],
      parser: "@typescript-eslint/parser",
      rules: {
        "export-restrict/no-export-private-declare": ["error"],
      },
    },
  ],
};
