import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { correlationId } from './middleware/correlationId';
import healthRouter      from './routes/health';
import authRouter        from './routes/auth';
import importRouter      from './routes/import';
import analyticsRouter   from './routes/analytics';
import adminRouter       from './routes/admin';
import timetableRouter   from './routes/timetable';

// Initialize BullMQ workers
import './workers/pdfWorker';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Security headers ───────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://anugat-ai-rho.vercel.app',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  ],
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Correlation ID ────────────────────────────────────────────
app.use(correlationId);

// ── Global rate limiter (auth endpoints get a stricter one) ───
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth',   authRouter);
app.use('/api/import', importRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/timetable', timetableRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Samayak API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Env:    ${process.env.NODE_ENV ?? 'development'}\n`);
});

export default app;
