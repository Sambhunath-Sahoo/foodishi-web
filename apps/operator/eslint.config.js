import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // scripts/ runs under Node, not in the browser: the seed generator reads
    // and writes files and reports what it wrote. Declared here rather than by
    // adding `globals` to this app's dependencies for one identifier.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
];
