"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost">
      <Printer size={15} /> {label}
    </button>
  );
}
