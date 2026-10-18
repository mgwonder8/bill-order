"use client";

import { useEffect } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-md px-6 py-10 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <DatabaseZap size={26} />
      </span>
      <h1 className="text-lg font-extrabold">Can&apos;t load your data right now</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.95rem] text-muted">Check your internet and try again. Nothing you saved is lost.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        <RefreshCw size={18} /> Try again
      </button>
      <p className="mt-5 text-xs text-muted">
        Still not working? The database may be paused. The owner can open Supabase and press <b>Restore project</b>.
        {error.digest && <span className="mt-1 block tnum">Code {error.digest}</span>}
      </p>
    </div>
  );
}
