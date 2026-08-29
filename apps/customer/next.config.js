/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared packages ship TypeScript source, not a build artefact.
  transpilePackages: ["@repo/ui", "@repo/api-client"],

  // Next writes its own AGENTS.md/CLAUDE.md on dev. This repo carries its
  // contract in packages/ui/DESIGN.md, so leave the app directories clean.
  agentRules: false,
};

export default nextConfig;
