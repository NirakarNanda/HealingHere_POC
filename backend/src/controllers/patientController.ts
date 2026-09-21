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
import { deletePatientFromSheet } from '../services/appsScriptService';
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
    remainingPayment: doc.remainingPayment ?? 0,
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
        remainingPayment: payload.remainingPayment ?? 0,
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

/**
 * DELETE /api/patients/:id — delete by _id or localId, then remove the
 * matching sheet row (keyed by localId) via Apps Script.
 *
 * The MongoDB delete always goes through; the sheet result is reported
 * separately so the caller can retry the sheet removal later. Deleting a
 * localId that no longer exists remotely is treated as success for the
 * sheet step (idempotent — the row is already gone).
 */
export async function deletePatient(req: Request, res: Response): Promise<void> {
  if (dbUnavailable(res)) return;
  const { id } = req.params;

  const filter = isValidObjectId(id) ? { _id: id } : { localId: id };
  const doc = await Patient.findOneAndDelete(filter).lean();

  // Always attempt the sheet delete by localId — even when the Mongo
  // document is already gone, the sheet row may still exist.
  const localId = doc ? String((doc as Record<string, unknown>).localId) : String(id);
  const sheetResult = await deletePatientFromSheet(localId);

  if (!doc) {
    res.status(200).json({
      success: true,
      mongoDeleted: false,
      sheetDeleted: sheetResult.ok,
      ...(sheetResult.ok ? {} : { sheetError: sheetResult.error }),
    });
    return;
  }

  res.status(200).json({
    success: true,
    mongoDeleted: true,
    sheetDeleted: sheetResult.ok,
    ...(sheetResult.ok ? {} : { sheetError: sheetResult.error }),
  });
}
