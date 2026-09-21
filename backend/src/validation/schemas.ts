/**
 * zod schemas for incoming request bodies.
 *
 * Phone numbers accept international formats: digits with an optional
 * leading +, plus spaces and dashes (6–15 significant characters).
 */
import { z } from 'zod';

const phoneRegex = /^[+\d][\d\s-]{4,14}\d$/;

export const patientPayloadSchema = z.object({
  localId: z.string().uuid('localId must be a valid UUID'),
  patientName: z.string().trim().min(2, 'Patient name must be at least 2 characters'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Date of birth must be a real date',
    }),
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
  createdAt: z.string().datetime({ offset: true, message: 'createdAt must be an ISO date string' }),
  updatedAt: z.string().datetime({ offset: true, message: 'updatedAt must be an ISO date string' }),
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
