import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config} */
export default [
  // `storybook build` output. Bundled third-party code, not source — linting
  // it reports thousands of warnings from other people's minified files and
  // fails the whole `turbo lint` run.
  { ignores: ["storybook-static/**"] },
  ...config,
];
