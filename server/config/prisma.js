const { PrismaClient } = require('@prisma/client');

/**
 * Configure database URL with a connection pool cap of 10
 */
function getDatabaseUrlWithPoolCap() {
  const originalUrl = process.env.DATABASE_URL || '';
  if (!originalUrl) return originalUrl;

  // Do not add if connection_limit is already present in query params
  if (/[?&]connection_limit=/.test(originalUrl)) {
    return originalUrl;
  }

  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}connection_limit=10`;
}

// Global singleton pattern to prevent multiple instances across hot reloads or imports
let prisma;

if (!global.__prismaInstance) {
  const dbUrl = getDatabaseUrlWithPoolCap();
  global.__prismaInstance = new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Graceful shutdown on SIGTERM and SIGINT
  const handleShutdown = async (signal) => {
    try {
      if (global.__prismaInstance) {
        await global.__prismaInstance.$disconnect();
      }
    } catch (err) {
      console.error(`Error disconnecting Prisma on ${signal}:`, err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

prisma = global.__prismaInstance;

module.exports = prisma;
