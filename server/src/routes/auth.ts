import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const faculty = await prisma.faculty.findUnique({
    where: { email, isDeleted: false },
  });

  if (!faculty) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, faculty.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({
    sub:   faculty.id,
    email: faculty.email,
    role:  faculty.role,
    name:  faculty.name,
  });

  res.json({
    token,
    user: {
      id:    faculty.id,
      name:  faculty.name,
      email: faculty.email,
      role:  faculty.role,
    },
  });
});

// ── POST /api/auth/demo ───────────────────────────────────────
// One-click demo login — no credentials needed
router.post('/demo', async (_req: Request, res: Response): Promise<void> => {
  const demoEmail = process.env.DEMO_ADMIN_EMAIL ?? 'admin@samayak.demo';

  const faculty = await prisma.faculty.findUnique({
    where: { email: demoEmail, isDeleted: false },
  });

  if (!faculty) {
    res.status(404).json({ error: 'Demo account not seeded yet. Run: npm run db:seed' });
    return;
  }

  const token = signToken({
    sub:   faculty.id,
    email: faculty.email,
    role:  faculty.role,
    name:  faculty.name,
  });

  res.json({
    token,
    user: {
      id:    faculty.id,
      name:  faculty.name,
      email: faculty.email,
      role:  faculty.role,
    },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) { res.status(401).json({ error: 'No token' }); return; }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const faculty = await prisma.faculty.findUnique({
      where: { id: payload.sub, isDeleted: false },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });
    if (!faculty) { res.status(401).json({ error: 'User not found' }); return; }
    res.json({ user: faculty });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
