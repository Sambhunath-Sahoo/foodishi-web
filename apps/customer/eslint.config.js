import { nextJsConfig } from "@repo/eslint-config/next-js";

/**
 * The shared config lints application source, which runs in a browser and so
 * gets browser globals only. `next.config.js` runs in Node, where `process`
 * exists — without this it reads as an undefined global.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...nextJsConfig,
  {
    files: ["*.config.js", "*.config.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
