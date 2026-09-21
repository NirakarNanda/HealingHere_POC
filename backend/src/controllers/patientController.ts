/**
 * Patient controller — CRUD over the MongoDB patient collection.
 *
 * Every record is keyed by the device-generated `localId`; the unique index
 * on localId is the idempotency guarantee across offline retries.
 */
import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { getDbState } from '../config/db';
import { Patient } from '../models/Patient';
import type { PatientPayloadInput } from '../validation/schemas';

function dbUnavailable(res: Response): boolean {
  if (getDbState() !== 'connected') {
    res.status(503).json({
      success: false,
      message: 'Database unavailable — please try again shortly',
    });
    return true;
  }
  return false;
}

function toApiPatient(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    localId: doc.localId,
    patientName: doc.patientName,
    dateOfBirth: doc.dateOfBirth,
    phone: doc.phone,
    gender: doc.gender,
    problem: doc.problem,
    injuryHistory: doc.injuryHistory ?? '',
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    syncedAt: doc.syncedAt ?? null,
  };
}

/** GET /api/patients — newest first. */
export async function listPatients(_req: Request, res: Response): Promise<void> {
  if (dbUnavailable(res)) return;
  const docs = await Patient.find().sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, patients: docs.map(toApiPatient) });
}

/** GET /api/patients/:id — accepts a Mongo _id or a device localId. */
export async function getPatient(req: Request, res: Response): Promise<void> {
  if (dbUnavailable(res)) return;
  const { id } = req.params;

  const doc = isValidObjectId(id)
    ? await Patient.findById(id).lean()
    : await Patient.findOne({ localId: id }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: 'Patient not found' });
    return;
  }
  res.status(200).json({ success: true, patient: toApiPatient(doc) });
}

/** POST /api/patients — direct create (upserts on localId to stay idempotent). */
export async function createPatient(req: Request, res: Response): Promise<void> {
  if (dbUnavailable(res)) return;
  const payload = req.body as PatientPayloadInput;

  const doc = await Patient.findOneAndUpdate(
    { localId: payload.localId },
    {
      $set: {
        patientName: payload.patientName,
        dateOfBirth: payload.dateOfBirth,
        phone: payload.phone,
        gender: payload.gender,
        problem: payload.problem,
        injuryHistory: payload.injuryHistory,
        notes: payload.notes,
        updatedAt: new Date(payload.updatedAt),
      },
      $setOnInsert: { createdAt: new Date(payload.createdAt) },
    },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  res.status(201).json({ success: true, patient: toApiPatient(doc as Record<string, unknown>) });
}

/** PUT /api/patients/:id — update by _id or localId; never changes localId. */
export async function updatePatient(req: Request, res: Response): Promise<void> {
  if (dbUnavailable(res)) return;
  const { id } = req.params;
  const payload = req.body as PatientPayloadInput;
  const { localId: _ignored, createdAt: _createdIgnored, ...updatable } = payload;

  const filter = isValidObjectId(id) ? { _id: id } : { localId: id };
  const doc = await Patient.findOneAndUpdate(
    filter,
    {
      $set: {
        ...updatable,
        updatedAt: new Date(payload.updatedAt),
      },
    },
    { new: true, runValidators: true },
  ).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: 'Patient not found' });
    return;
  }
  res.status(200).json({ success: true, patient: toApiPatient(doc as Record<string, unknown>) });
}
