"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
    >
      <Printer size={15} />
      {label}
    </button>
  );
}
