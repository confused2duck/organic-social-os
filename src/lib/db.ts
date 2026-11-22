import { PrismaClient } from "@prisma/client";

// Singleton Prisma client — avoids exhausting SQLite connections during Next.js
// dev hot-reload, and is shared by the web app and the background worker.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
