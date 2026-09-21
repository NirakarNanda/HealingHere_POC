/**
 * Typed environment configuration.
 *
 * Loads .env via dotenv and validates the variables the server cannot run
 * without. Fails fast at boot so misconfiguration is caught before the
 * server starts serving requests.
 */
import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER_SESSION_SECRET = 'change-me-to-a-long-random-string';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[config] FATAL: missing required environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() ?? fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

const sessionSecret = required('SESSION_SECRET');

if (sessionSecret === PLACEHOLDER_SESSION_SECRET) {
  if (isProduction) {
    console.error(
      '[config] FATAL: SESSION_SECRET is still the placeholder value. ' +
        'Set a long random string before running in production.',
    );
    process.exit(1);
  }
  console.warn(
    '[config] WARNING: SESSION_SECRET is the default placeholder. ' +
      'This is only acceptable for local POC development — generate a real secret before production.',
  );
}

export const env = {
  port: Number.parseInt(optional('PORT', '5000'), 10) || 5000,
  nodeEnv,
  isProduction,
  mongodbUri: optional('MONGODB_URI', 'mongodb://127.0.0.1:27017/bijayalakshmi_physiotherapy'),
  adminUsername: required('ADMIN_USERNAME'),
  adminPassword: required('ADMIN_PASSWORD'),
  sessionSecret,
  appsScriptUrl: optional('APPS_SCRIPT_URL', ''),
  frontendUrls: optional('FRONTEND_URL', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  sessionCookieName: 'bp.sid',
} as const;

export type Env = typeof env;
