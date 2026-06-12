import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

// Role hierarchy — higher index = more permissions
const ROLE_RANK: Record<Role, number> = {
  PROFESSOR:   0,
  COORDINATOR: 1,
  HOD:         2,
  DEAN:        3,
  ADMIN:       4,
};

/**
 * Middleware factory: restrict access to routes requiring at least one of the given roles.
 * Usage: router.post('/departments', requireAuth, requireRole('ADMIN', 'COORDINATOR'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorised' });
      return;
    }

    const hasAccess = roles.some(
      (role) => ROLE_RANK[user.role] >= ROLE_RANK[role],
    );

    if (!hasAccess) {
      res.status(403).json({
        error: `Forbidden — requires one of: ${roles.join(', ')}`,
        yourRole: user.role,
      });
      return;
    }

    next();
  };
}
