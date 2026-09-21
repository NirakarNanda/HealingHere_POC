/**
 * Bijayalakshmi Physiotherapy — local development / traditional Node entry.
 *
 * For Vercel serverless, see api/index.ts instead.
 *
 * The server starts even when MongoDB is unreachable so /api/health always
 * answers; database-dependent routes return 503 until the connection is
 * established.
 */
import { app } from './app';
import { connectToMongo } from './config/db';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectToMongo();

  app.listen(env.port, () => {
    console.log(`[server] Bijayalakshmi Physiotherapy API listening on port ${env.port}`);
    console.log(`[server] env=${env.nodeEnv} frontend=${env.frontendUrls.join(', ')}`);
    if (!env.appsScriptUrl) {
      console.log('[server] APPS_SCRIPT_URL not set — Google Sheets step will be skipped (dev mode)');
    }
  });
}

void start();
