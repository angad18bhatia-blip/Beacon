import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "@/generated/prisma/client";

// Query over HTTP/WebSocket via Neon's serverless driver instead of
// Prisma's native binary query engine — the engine binary repeatedly
// failed to load in Vercel's serverless runtime (PrismaClientInitializationError:
// could not locate the Query Engine for runtime "rhel-openssl-3.0.x") despite
// correct binaryTargets and file-tracing config; this removes that dependency
// entirely rather than continuing to chase it.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
