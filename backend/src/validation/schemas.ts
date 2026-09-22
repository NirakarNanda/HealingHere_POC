/**
 * zod schemas for incoming request bodies.
 *
 * Phone numbers accept international formats: digits with an optional
 * leading +, plus spaces and dashes (6–15 significant characters).
 */
import { z } from 'zod';

const phoneRegex = /^[+\d][\d\s-]{4,14}\d$/;

/** Whole-year age derived from a legacy YYYY-MM-DD date of birth. */
function dobToAge(dob: string): number {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 31557600000));
}

export const patientPayloadSchema = z.object({
  localId: z.string().uuid('localId must be a valid UUID'),
  patientName: z.string().trim().min(2, 'Patient name must be at least 2 characters'),
  /** Age in whole years. Replaced dateOfBirth everywhere (2026-09-22). */
  age: z
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(150, 'Age looks too high')
    .optional(),
  /**
   * Legacy field from older clients / pre-migration local records.
   * Accepted and converted to `age` so old data keeps syncing.
   */
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Date of birth must be a real date',
    })
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Phone number must contain 6–15 digits (may include +, spaces, dashes)'),
  gender: z.enum(['Male', 'Female', 'Other'], {
    error: 'Gender must be Male, Female or Other',
  }),
  problem: z.string().trim().min(2, 'Problem / chief complaint must be at least 2 characters'),
  injuryHistory: z.string().default(''),
  notes: z.string().default(''),
  /** ₹ still owed by the patient. Optional for old clients — defaults to 0. */
  remainingPayment: z.number().min(0, 'Remaining payment cannot be negative').default(0),
  createdAt: z.string().datetime({ offset: true, message: 'createdAt must be an ISO date string' }),
  updatedAt: z.string().datetime({ offset: true, message: 'updatedAt must be an ISO date string' }),
})
  .refine((data) => data.age !== undefined || data.dateOfBirth !== undefined, {
    message: 'Age is required',
  })
  .transform((data) => {
    // The validate middleware replaces req.body with the parsed output, so
    // controllers always see a concrete `age` — legacy dateOfBirth is
    // converted here and never leaks downstream.
    const { dateOfBirth: _legacyDob, ...rest } = data;
    return { ...rest, age: data.age ?? dobToAge(data.dateOfBirth as string) };
  });

export type PatientPayloadInput = z.infer<typeof patientPayloadSchema>;

export const syncRequestSchema = z.object({
  patients: z
    .array(patientPayloadSchema)
    .min(1, 'At least one patient is required')
    .max(200, 'A maximum of 200 patients per sync batch'),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
