/**
 * requireAuth middleware — protects routes behind the doctor's session.
 */
import type { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }
  next();
}
