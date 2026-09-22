/**
 * Patient Mongoose model.
 *
 * `localId` is the idempotency key shared across IndexedDB → MongoDB →
 * Google Sheets. The unique index guarantees one record per localId even if
 * the same patient is submitted more than once (offline retries, double
 * taps, replayed sync batches).
 *
 * createdAt/updatedAt use Mongoose timestamps, but client-supplied values
 * are honoured so the device's original timestamps are preserved through
 * the sync pipeline.
 */
import mongoose, { type InferSchemaType } from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    localId: { type: String, required: true, unique: true, index: true },
    patientName: { type: String, required: true, trim: true },
    // Age in whole years. Replaced the old `dateOfBirth` string (2026-09-22).
    // Not `required`: documents written before the migration only carry
    // dateOfBirth, and they must keep validating on updates.
    age: { type: Number, min: 0, max: 150, default: 0 },
    phone: { type: String, required: true, trim: true },
    gender: { type: String, required: true },
    problem: { type: String, required: true, trim: true },
    injuryHistory: { type: String, default: '' },
    notes: { type: String, default: '' },
    remainingPayment: { type: Number, default: 0, min: 0 }, // ₹ still owed by the patient
    syncedAt: { type: Date, required: false },
  },
  {
    timestamps: true, // manages createdAt / updatedAt
    versionKey: false,
  },
);

// Extra safety net: even if the `unique: true` shorthand is ever removed,
// the explicit unique index keeps duplicate localIds impossible.
patientSchema.index({ localId: 1 }, { unique: true });

export type PatientDocument = InferSchemaType<typeof patientSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Patient =
  mongoose.models.Patient ?? mongoose.model('Patient', patientSchema);
