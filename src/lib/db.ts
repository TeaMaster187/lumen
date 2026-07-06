import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaError: Error | undefined
}

/**
 * Lazily creates the PrismaClient on first access.
 * If the native query engine binary can't load (e.g. on a platform we
 * didn't build for), this throws — but only when code actually tries to
 * use the DB, not at module load time. That way the app can still serve
 * /api/health and the login page even if Prisma is broken.
 */
function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error'],
  })
}

/**
 * Returns the singleton PrismaClient, creating it on first call.
 * Caches any init error so we don't retry on every request.
 */
export function getDb(): PrismaClient {
  if (globalForPrisma.prismaError) throw globalForPrisma.prismaError
  if (!globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma = createClient()
    } catch (e) {
      globalForPrisma.prismaError = e instanceof Error ? e : new Error(String(e))
      throw globalForPrisma.prismaError
    }
  }
  return globalForPrisma.prisma
}

/**
 * Convenience proxy — `db.user.findMany()` etc. work as before,
 * but the client is only created on first property access.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})
