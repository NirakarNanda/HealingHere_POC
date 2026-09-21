/**
 * Shared Vercel serverless handler.
 *
 * Each file under backend/api/ is a thin re-export of this handler. Vercel
 * creates one serverless function per api/ file and routes by file path, so
 * every backend endpoint gets an explicit function — no wildcard/rewrite
 * routing magic involved. The Express app itself does method+path routing.
 */
import { app } from './app';
import { ensureDbConnected } from './config/db';

export default async function handler(req: unknown, res: unknown): Promise<void> {
  await ensureDbConnected().catch(() => {
    /* degraded mode: routes needing Mongo will return 503 */
  });
  (app as unknown as (req: unknown, res: unknown) => void)(req, res);
}
