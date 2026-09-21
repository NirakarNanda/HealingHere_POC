/**
 * Authentication controller — single doctor account.
 *
 * Credentials live only in server-side env vars. Passwords are compared
 * with crypto.timingSafeEqual (inputs padded to equal length) to avoid
 * leaking correctness through timing. A session is issued in an HTTP-only
 * cookie; no tokens are ever exposed to client JavaScript.
 */
import { timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import type { SessionUser } from '../types';

const DOCTOR_NAME = 'Dr. Abhilash Nanda';

/**
 * Constant-time string comparison. Both inputs are padded to the same
 * length so timingSafeEqual never throws and length itself leaks nothing
 * beyond what a wrong password already reveals.
 */
function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length, 1);
  const aBuf = Buffer.alloc(length);
  const bBuf = Buffer.alloc(length);
  aBuf.write(a);
  bBuf.write(b);
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

function buildUser(username: string): SessionUser {
  return { username, name: DOCTOR_NAME };
}

export function login(req: Request, res: Response): void {
  const { username, password } = req.body as { username?: string; password?: string };

  const usernameOk = typeof username === 'string' && safeEqual(username.trim(), env.adminUsername);
  const passwordOk = typeof password === 'string' && safeEqual(password, env.adminPassword);

  if (!usernameOk || !passwordOk) {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
    return;
  }

  const user = buildUser(env.adminUsername);
  req.session.user = user;
  res.status(200).json({ success: true, user });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      console.error('[auth] session destroy failed:', err);
      res.status(500).json({ success: false, message: 'Logout failed' });
      return;
    }
    res.clearCookie(env.sessionCookieName, { path: '/' });
    res.status(200).json({ success: true, message: 'Logged out' });
  });
}

export function me(req: Request, res: Response): void {
  const user = req.session?.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }
  res.status(200).json({ success: true, authenticated: true, user });
}
