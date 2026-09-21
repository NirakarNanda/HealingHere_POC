/**
 * Bijayalakshmi Physiotherapy — Express application factory.
 *
 * Builds the app without starting a listener so it can be reused by:
 *  - src/server.ts   (local development / traditional Node hosting)
 *  - api/index.ts    (Vercel serverless function)
 *
 * Middleware order: JSON body parsing → CORS → session → routes →
 * 404 → error handler.
 */
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import patientRoutes from './routes/patients';
import syncRoutes from './routes/sync';

export function createApp(): express.Express {
  const app = express();

  // Trust the reverse proxy when deployed behind one (needed for the
  // `secure` session cookie in production — e.g. Vercel's edge network).
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
  //
  //    In production the session store is MongoDB (connect-mongo): Vercel
  //    serverless functions are stateless, so the default in-memory store
  //    would lose sessions between invocations. Local dev keeps the memory
  //    store so the server still boots when MongoDB is unreachable.
  //
  //    Production also uses `sameSite: 'none'` (with `secure`) because the
  //    frontend and API live on different origins (two Vercel projects) —
  //    `lax` would silently drop the cookie on cross-origin fetch calls.
  app.use(
    session({
      name: env.sessionCookieName,
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: env.isProduction
        ? MongoStore.create({
            mongoUrl: env.mongodbUri,
            ttl: 12 * 60 * 60, // 12 hours, matches the cookie maxAge
            collectionName: 'sessions',
          })
        : undefined,
      cookie: {
        httpOnly: true,
        sameSite: env.isProduction ? 'none' : 'lax',
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

  return app;
}

/** Shared singleton — safe to reuse across invocations in one instance. */
export const app = createApp();
