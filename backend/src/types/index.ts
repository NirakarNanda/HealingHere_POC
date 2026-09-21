/**
 * Shared TypeScript types for the API layer.
 */

export interface PatientPayload {
  localId: string;
  patientName: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone: string;
  gender: string;
  problem: string;
  injuryHistory: string;
  notes: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type SyncItemStatus = 'SYNCED' | 'FAILED';

export interface SyncResultItem {
  localId: string;
  status: SyncItemStatus;
  serverId?: string;
  error?: string;
}

export interface SessionUser {
  username: string;
  name: string;
}

// Augment express-session so req.session.user is typed.
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
