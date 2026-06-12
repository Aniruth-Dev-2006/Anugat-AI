import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redisConnection } from '../lib/queue';

const router = Router();

/**
 * GET /api/health
 * Public — deployment health check.
 * Returns live status of DB, Redis, and overall app.
 */
router.get('/', async (_req: Request, res: Response) => {
  const health: Record<string, string> = {};

  // Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'ok';
  } catch {
    health.database = 'error';
  }

  // Check Redis
  try {
    await redisConnection.ping();
    health.redis = 'ok';
  } catch {
    health.redis = 'error';
  }

  const allOk = Object.values(health).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: health,
  });
});

export default router;
