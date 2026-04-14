// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  // Base: ESLint recommended + TypeScript-ESLint recommended
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  // Project-wide settings
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      // Disable the JS version; use the TS-aware version below
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Allow ternary expressions used purely for side-effects (e.g. set.has(x) ? set.delete(x) : set.add(x))
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true }],
    },
  },
  // Ignore build artefacts
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);
