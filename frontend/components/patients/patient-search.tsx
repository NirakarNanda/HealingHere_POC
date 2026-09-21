"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PatientSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search patients…"
        aria-label="Search patients by name or phone"
        className="pl-11"
      />
    </div>
  );
}
