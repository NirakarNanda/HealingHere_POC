"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPatient } from "@/lib/db/patient-repository";
import { triggerSync } from "@/lib/sync/sync-engine";
import type { PatientFormValues } from "@/types/patient";
import { cn } from "@/lib/utils";

interface FieldErrors {
  patientName?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: string;
  problem?: string;
}

const GENDERS = ["Male", "Female", "Other"] as const;

function validate(values: PatientFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.patientName.trim()) errors.patientName = "Please enter the patient's name.";
  else if (values.patientName.trim().length < 2) errors.patientName = "Name looks too short.";

  if (!values.dateOfBirth) errors.dateOfBirth = "Please choose the date of birth.";
  else {
    const dob = new Date(values.dateOfBirth);
    if (Number.isNaN(dob.getTime())) errors.dateOfBirth = "That date doesn't look right.";
    else if (dob > new Date()) errors.dateOfBirth = "Date of birth can't be in the future.";
  }

  const digits = values.phone.replace(/\D/g, "");
  if (!values.phone.trim()) errors.phone = "Please enter a phone number.";
  else if (digits.length < 10) errors.phone = "Please enter at least 10 digits.";

  if (!values.gender) errors.gender = "Please select a gender.";

  if (!values.problem.trim()) errors.problem = "Please describe the problem or chief complaint.";
  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[13px] font-medium text-destructive animate-fade-in">
      {message}
    </p>
  );
}

/**
 * Premium patient form. On submit: UUID → IndexedDB (PENDING) → instant UI
 * update → toast → background sync. Never waits for the network.
 */
export function PatientForm({ onSaved }: { onSaved?: () => void }) {
  const [values, setValues] = useState<PatientFormValues>({
    patientName: "",
    dateOfBirth: "",
    phone: "",
    gender: "",
    problem: "",
    injuryHistory: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PatientFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const inputClass = (hasError?: string) => cn(hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validate(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      await createPatient(values);
      const wasOffline = typeof navigator !== "undefined" && !navigator.onLine;
      toast.success(
        wasOffline
          ? "Saved locally · Will sync when internet returns"
          : "Patient saved safely on this device"
      );
      if (!wasOffline) triggerSync();
      onSaved?.();
    } catch {
      toast.error("Could not save the patient. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="patientName">Patient name *</Label>
          <Input
            id="patientName"
            autoComplete="name"
            placeholder="e.g. Priya Sharma"
            value={values.patientName}
            onChange={set("patientName")}
            aria-invalid={!!errors.patientName}
            aria-describedby={errors.patientName ? "patientName-error" : undefined}
            className={inputClass(errors.patientName)}
          />
          <FieldError message={errors.patientName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={set("dateOfBirth")}
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={!!errors.dateOfBirth}
            className={inputClass(errors.dateOfBirth)}
          />
          <FieldError message={errors.dateOfBirth} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number *</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 98765 43210"
            value={values.phone}
            onChange={set("phone")}
            aria-invalid={!!errors.phone}
            className={inputClass(errors.phone)}
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select
            value={values.gender || undefined}
            onValueChange={(v) => {
              setValues((prev) => ({ ...prev, gender: v }));
              setErrors((prev) => ({ ...prev, gender: undefined }));
            }}
          >
            <SelectTrigger id="gender" aria-invalid={!!errors.gender} className={inputClass(errors.gender)}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.gender} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="problem">Problem / chief complaint *</Label>
          <Textarea
            id="problem"
            placeholder="e.g. Lower back pain for 3 weeks, worse in the morning"
            value={values.problem}
            onChange={set("problem")}
            aria-invalid={!!errors.problem}
            className={inputClass(errors.problem)}
          />
          <FieldError message={errors.problem} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="injuryHistory">Injury history</Label>
          <Textarea
            id="injuryHistory"
            placeholder="Any previous injuries, surgeries, or relevant history (optional)"
            value={values.injuryHistory}
            onChange={set("injuryHistory")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Clinical notes, observations, treatment plan (optional)"
            value={values.notes}
            onChange={set("notes")}
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-44" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save Patient"
        )}
      </Button>
    </form>
  );
}
