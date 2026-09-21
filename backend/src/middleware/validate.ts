/**
 * zod-based request body validator.
 *
 * Usage: router.post('/', validate(patientSchema), handler)
 * On failure responds 400 with a readable list of field errors.
 */
import type { NextFunction, Request, Response } from 'express';
import { z, type ZodSchema } from 'zod';

export function validate<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export { z };
