/**
 * Vercel serverless entry point for the Express API.
 *
 * This is a catch-all function (`/api/*`): Vercel routes every request under
 * /api to it while preserving the original request URL, so the Express app
 * does the routing itself. The MongoDB connection is (re)used across warm
 * invocations. If the database is unreachable the request still flows into
 * the app, which answers 503 for DB-dependent routes and keeps /api/health
 * honest — the same degradation policy as local dev.
 */
import { app } from '../src/app';
import { ensureDbConnected } from '../src/config/db';

// Vercel invokes the default export with (req, res). Express apps are
// request handlers, so we can pass them straight through.
export default async function handler(req: unknown, res: unknown): Promise<void> {
  await ensureDbConnected().catch(() => {
    /* degraded mode: routes needing Mongo will return 503 */
  });
  (app as unknown as (req: unknown, res: unknown) => void)(req, res);
}
