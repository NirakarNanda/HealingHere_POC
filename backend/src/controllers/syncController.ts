/**
 * Sync controller — the heart of the offline-first pipeline.
 *
 * POST /api/sync accepts { patients: PatientPayload[] }.
 * For each patient, independently:
 *   1. zod-validate (already done by the route middleware),
 *   2. upsert into MongoDB keyed on localId — never duplicates,
 *   3. forward to Google Apps Script → Google Sheets.
 *
 * Each patient gets its own result entry; one failure never blocks the
 * rest of the batch. The frontend flips local records to SYNCED or FAILED
 * based on these per-patient results.
 */
import type { Request, Response } from 'express';
import { getDbState } from '../config/db';
import { Patient } from '../models/Patient';
import { pushPatientToSheet } from '../services/appsScriptService';
import type { SyncResultItem } from '../types';
import type { PatientPayloadInput } from '../validation/schemas';

export async function syncPatients(req: Request, res: Response): Promise<void> {
  if (getDbState() !== 'connected') {
    res.status(503).json({
      success: false,
      message: 'Database unavailable — sync cannot proceed, local data is safe',
    });
    return;
  }

  const { patients } = req.body as { patients: PatientPayloadInput[] };
  const results: SyncResultItem[] = [];

  for (const patient of patients) {
    try {
      // 1) Persist to MongoDB. findOneAndUpdate + upsert keyed on localId
      //    makes retries idempotent — the same localId always yields
      //    exactly one document.
      const doc = await Patient.findOneAndUpdate(
        { localId: patient.localId },
        {
          $set: {
            patientName: patient.patientName,
            dateOfBirth: patient.dateOfBirth,
            phone: patient.phone,
            gender: patient.gender,
            problem: patient.problem,
            injuryHistory: patient.injuryHistory,
            notes: patient.notes,
            remainingPayment: patient.remainingPayment ?? 0,
            updatedAt: new Date(patient.updatedAt),
            syncedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date(patient.createdAt) },
        },
        { upsert: true, new: true, runValidators: true },
      );

      // 2) Forward to Google Sheets via Apps Script. A Sheets failure
      //    still leaves the MongoDB record intact; the frontend marks the
      //    local record FAILED so it can be retried later.
      const sheetResult = await pushPatientToSheet({
        ...patient,
        syncedAt: new Date().toISOString(),
      });

      if (!sheetResult.ok) {
        results.push({
          localId: patient.localId,
          status: 'FAILED',
          serverId: String(doc._id),
          error: sheetResult.error ?? 'Google Sheets sync failed',
        });
        continue;
      }

      results.push({
        localId: patient.localId,
        status: 'SYNCED',
        serverId: String(doc._id),
      });
    } catch (err) {
      console.error(`[sync] patient ${patient.localId} failed:`, err);
      results.push({
        localId: patient.localId,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Unknown sync error',
      });
    }
  }

  res.status(200).json({ success: true, results });
}
