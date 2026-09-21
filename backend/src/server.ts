/**
 * Bijayalakshmi Physiotherapy — backend entry point.
 *
 * Middleware order: JSON body parsing → CORS → session → routes →
 * 404 → error handler.
 *
 * The server starts even when MongoDB is unreachable so /api/health always
 * answers; database-dependent routes return 503 until the connection is
 * established.
 */
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { connectToMongo } from './config/db';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import patientRoutes from './routes/patients';
import syncRoutes from './routes/sync';

const app = express();

// Trust the reverse proxy when deployed behind one (needed for the
// `secure` session cookie in production).
if (env.isProduction) {
  app.set('trust proxy', 1);
}

// 1) Body parsing.
app.use(express.json({ limit: '256kb' }));

// 2) CORS — restricted to the configured frontend origin(s), with
//    credentials so the session cookie is sent cross-origin.
//    FRONTEND_URL may be a comma-separated list. In non-production, any
//    http://localhost:<port> origin is also accepted so the frontend can
//    run on whatever port is free (3000, 3002, ...) without backend changes.
const allowedOrigins: string[] = env.frontendUrls;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser clients (curl)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!env.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// 3) Session — HTTP-only cookie; the browser can never read it via JS.
app.use(
  session({
    name: env.sessionCookieName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      path: '/',
    },
  }),
);

// 4) Routes.
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sync', syncRoutes);

// 5) 404 + central error handler.
app.use(notFound);
app.use(errorHandler);

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
