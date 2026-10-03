"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Camera, Delete, Eye, EyeOff, FileText, Loader2, Truck, X } from "lucide-react";
import { BrandMark } from "@/components/ui";

const NAMES_KEY = "tagbill:names";

function readNamesRaw(): string {
  try {
    return localStorage.getItem(NAMES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseNames(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function rememberName(name: string) {
  try {
    const next = [name, ...parseNames(readNamesRaw()).filter((n) => n.toLowerCase() !== name.toLowerCase())].slice(0, 4);
    localStorage.setItem(NAMES_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked (private mode); the shortcut just won't appear next time.
  }
}

const STEPS = [
  { icon: Camera, short: "Photo", title: "Photo of the tag", body: "Sizes and rates fill in by themselves" },
  { icon: FileText, short: "Bill", title: "GST bill in one tap", body: "Share on WhatsApp or download" },
  { icon: Truck, short: "Supplier", title: "Supplier report", body: "Everything sold today, per supplier" },
];

export function LoginForm({
  action,
  failed,
  shopName,
}: {
  action: (formData: FormData) => Promise<void>;
  failed: boolean;
  shopName: string;
}) {
  const raw = useSyncExternalStore(subscribeStorage, readNamesRaw, () => "[]");
  const names = useMemo(() => parseNames(raw), [raw]);
  // After a wrong passcode the server sends us back here: keep the last name and go straight to the passcode.
  const [typed, setName] = useState<string | null>(null);
  const [chosenStep, setStep] = useState<1 | 2 | null>(null);
  const name = typed ?? (failed ? (names[0] ?? "") : "");
  const step = chosenStep ?? (failed && names[0] ? 2 : 1);
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const pinInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === 2 ? pinInput : nameInput).current?.focus({ preventScroll: true });
  }, [step]);

  function next(chosen = name) {
    const n = chosen.trim();
    if (!n) return nameInput.current?.focus();
    setName(n);
    setStep(2);
  }

  function press(d: string) {
    setPin((p) => (p.length < 12 ? p + d : p));
  }

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] px-6 pt-9 pb-24 text-white lg:flex lg:flex-col lg:justify-center lg:px-14 lg:pb-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <div className="flex items-center gap-3">
            <span className="rounded-[28%] bg-white/15 p-1 ring-1 ring-white/25">
              <BrandMark size={40} />
            </span>
            <div>
              <p className="text-xl font-extrabold tracking-tight">TagBill</p>
              <p className="text-sm text-white/70">{shopName}</p>
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight lg:text-4xl">
            Bills from a photo
            <br />
            of the tag.
          </h1>
          <ol className="mt-5 flex items-center gap-2 text-xs font-semibold text-white/85 lg:hidden">
            {STEPS.map(({ icon: Icon, short }, i) => (
              <li key={short} className="flex items-center gap-2">
                {i > 0 && <ArrowRight size={13} className="text-white/50" />}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1.5 ring-1 ring-white/20">
                  <Icon size={13} /> {short}
                </span>
              </li>
            ))}
          </ol>
          <ul className="mt-7 hidden space-y-4 lg:block">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-bold">
                    {i + 1}. {title}
                  </span>
                  <span className="block text-sm text-white/70">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative z-10 -mt-16 flex justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-10">
        <form
          action={(fd) => {
            rememberName(name);
            return action(fd);
          }}
          className={`card w-full max-w-md self-start p-6 shadow-xl shadow-indigo-900/10 lg:self-center lg:p-8 ${failed ? "shake" : ""}`}
        >
          <input type="hidden" name="name" value={name} />

          <div className="mb-6 flex items-center gap-2" aria-hidden>
            <span className="h-1.5 flex-1 rounded-full bg-accent" />
            <span className={`h-1.5 flex-1 rounded-full transition-colors ${step === 2 ? "bg-accent" : "bg-line"}`} />
          </div>

          {step === 1 ? (
            <div className="rise">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Step 1 of 2</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Who is working today?</h2>

              {names.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {names.map((n) => (
                    <button key={n} type="button" onClick={() => next(n)} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-left font-bold hover:border-accent hover:bg-accent-soft">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm uppercase text-accent">{n.charAt(0)}</span>
                      <span className="truncate">{n}</span>
                    </button>
                  ))}
                </div>
              )}

              <label className="label mt-5" htmlFor="who">
                {names.length > 0 ? "Or type a name" : "Your name"}
              </label>
              <input
                ref={nameInput}
                id="who"
                className="field text-lg"
                placeholder="e.g. Rohit"
                autoComplete="name"
                enterKeyHint="next"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    next();
                  }
                }}
              />
              <button type="button" onClick={() => next()} disabled={!name.trim()} className="btn btn-primary btn-lg mt-5 w-full">
                Continue <ArrowRight size={19} />
              </button>
            </div>
          ) : (
            <div className="rise">
              <button type="button" onClick={() => setStep(1)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
                <ArrowLeft size={16} /> Not {name}?
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Step 2 of 2</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Hi {name}, enter the shop passcode</h2>

              {failed && (
                <p className="alert-error mt-4 flex items-center gap-2">
                  <X size={17} /> That passcode is not right. Try again.
                </p>
              )}

              <div className="relative mt-5">
                <input
                  ref={pinInput}
                  name="passcode"
                  type={show ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  aria-label="Shop passcode"
                  className="field h-16 pr-14 text-center text-2xl font-bold tracking-[0.4em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-black/[0.04]"
                  aria-label={show ? "Hide passcode" : "Show passcode"}
                >
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <Key key={d} onClick={() => press(d)}>
                    {d}
                  </Key>
                ))}
                <Key onClick={() => setPin("")} muted>
                  <span className="text-sm font-bold">Clear</span>
                </Key>
                <Key onClick={() => press("0")}>0</Key>
                <Key onClick={() => setPin((p) => p.slice(0, -1))} muted label="Delete last digit">
                  <Delete size={22} />
                </Key>
              </div>

              <Submit disabled={!pin} />
              <p className="mt-3 text-center text-sm text-muted">Everyone in the shop uses the same passcode.</p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function Key({ children, onClick, muted = false, label }: { children: React.ReactNode; onClick: () => void; muted?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-14 place-items-center rounded-xl text-xl font-bold transition active:scale-95 ${
        muted ? "bg-transparent text-muted hover:bg-black/[0.04]" : "bg-background hover:bg-accent-soft hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-primary btn-lg mt-5 w-full">
      {pending ? <Loader2 className="animate-spin" size={19} /> : null}
      {pending ? "Opening…" : "Open the shop"}
    </button>
  );
}
