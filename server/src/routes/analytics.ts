import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { computeDashboardAnalytics } from '../services/analytics';

const router = Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const data = await computeDashboardAnalytics(req.query.semesterId as string);
    res.json(data);
  } catch (error) {
    console.error('[Analytics] Error computing dashboard data:', error);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

export default router;
