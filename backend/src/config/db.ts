/**
 * MongoDB connection helper.
 *
 * The server boots even when MongoDB is unreachable (so /api/health always
 * answers), and Mongoose retries the connection in the background. The
 * current connection state is exposed for the health endpoint.
 */
import mongoose from 'mongoose';
import { env } from './env';

export type DbState = 'connected' | 'disconnected';

export function getDbState(): DbState {
  // readyState 1 = connected, 2 = connecting — both count as usable.
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export async function connectToMongo(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected — retrying in background');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', (err as Error).message);
  });

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    // Keep the process alive: the health endpoint must still respond and
    // mongoose will keep retrying in the background.
    console.error(
      '[db] Could not reach MongoDB at startup:',
      (err as Error).message,
    );
    console.error('[db] Server continues without a database connection; API calls needing Mongo will return 503.');
    // Re-attempt connection in the background so a late-starting mongod is picked up.
    void mongoose.connect(env.mongodbUri).catch(() => {
      /* errors already logged via the 'error' listener */
    });
  }
}
