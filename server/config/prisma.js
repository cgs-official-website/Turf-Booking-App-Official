const { PrismaClient } = require('@prisma/client');

/**
 * Configure database URL with a connection pool cap of 10
 */
function getDatabaseUrlWithPoolCap() {
  const originalUrl = process.env.DATABASE_URL || '';
  if (!originalUrl) return originalUrl;

  try {
    const urlObj = new URL(originalUrl);
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '20');
    }
    if (!urlObj.searchParams.has('connect_timeout')) {
      urlObj.searchParams.set('connect_timeout', '30');
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '30');
    }
    if (!urlObj.searchParams.has('sslmode') && (originalUrl.includes('rlwy.net') || originalUrl.includes('railway.app'))) {
      urlObj.searchParams.set('sslmode', 'no-verify');
    }
    return urlObj.toString();
  } catch (e) {
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}connection_limit=20&connect_timeout=30&pool_timeout=30&sslmode=no-verify`;
  }
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
