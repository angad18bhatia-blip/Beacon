import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's serverless-function file tracing doesn't automatically pick
  // up Prisma's generated query engine binary since it lives in a custom
  // output path (src/generated/prisma, not the default node_modules/.prisma
  // location it special-cases) — without this, Vercel deploys without the
  // binary and every DB call fails at runtime with PrismaClientInitializationError.
  outputFileTracingIncludes: {
    // Only the engine binary needs forcing in — the generated .ts client
    // files are already picked up by normal static-import tracing since
    // they're actually `import`ed. Deliberately excludes the macOS
    // (darwin-arm64) engine: it's dead weight on Vercel's Linux runtime
    // and only bloats the deployed function.
    "/*": ["./src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node"],
  },
};

export default nextConfig;
