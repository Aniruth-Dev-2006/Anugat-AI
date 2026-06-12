import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Injects a unique X-Correlation-Id on every request.
 * Reuses the header if the client sent one; otherwise generates a new UUID v4.
 * The ID flows through all logs so any request can be fully traced.
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id =
    (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();

  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}
