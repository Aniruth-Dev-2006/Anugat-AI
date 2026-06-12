import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface AuthPayload {
  sub: string;   // faculty id
  email: string;
  role: Role;
  name: string;
}

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorised — no token provided' });
    return;
  }

  // --- DEMO BYPASS ---
  if (token === 'demo-token') {
    req.user = {
      sub: 'demo-admin',
      email: 'admin@samayak.demo',
      role: 'ADMIN',
      name: 'Demo Admin'
    };
    return next();
  }
  // -------------------

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorised — invalid or expired token' });
  }
}
