import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's serverless-function file tracing doesn't automatically pick
  // up Prisma's generated query engine binary since it lives in a custom
  // output path (src/generated/prisma, not the default node_modules/.prisma
  // location it special-cases) — without this, Vercel deploys without the
  // binary and every DB call fails at runtime with PrismaClientInitializationError.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
