/**
 * Central error handler. Always returns JSON; stack traces are only
 * included outside production.
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = (err as { status?: number }).status ?? 500;
  const message =
    (err as { message?: string }).message ?? 'Internal server error';

  if (!env.isProduction) {
    console.error('[error]', err);
  }

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : message,
    ...(!env.isProduction && err instanceof Error ? { stack: err.stack } : {}),
  });
}

/** 404 for unmatched /api routes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Not found' });
}
