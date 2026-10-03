import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

export const STEP_NAMES = ["Scan & order", "Make bill", "Supplier report"] as const;

export function PageHeader({
  title,
  subtitle,
  action,
  step,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  step?: number;
  back?: { href: string; label: string };
}) {
  return (
    <div className="no-print mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft size={16} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {step && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              Step {step} of 3 · {STEP_NAMES[step - 1]}
            </p>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[1.75rem]">{title}</h1>
          {subtitle && <p className="mt-1 text-[0.95rem] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function StepBadge({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent ${
        small ? "h-7 w-7 text-sm" : "h-9 w-9 text-base"
      }`}
    >
      {n}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{label}</p>
        {Icon && <Icon size={18} className="text-muted" />}
      </div>
      <p className="mt-1.5 text-[1.6rem] font-extrabold leading-tight tracking-tight tnum">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  cta,
  icon: Icon,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
  icon?: LucideIcon;
}) {
  return (
    <Card className="px-6 py-12 text-center">
      {Icon && (
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={26} />
        </span>
      )}
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[0.95rem] text-muted">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-5">
          {cta.label}
        </Link>
      )}
    </Card>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "muted" | "accent" | "warn"; children: ReactNode }) {
  const tones = {
    ok: "bg-ok-soft text-ok",
    muted: "bg-black/[0.05] text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-primary">
      {children}
    </Link>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

/** Square brand mark: a price tag with a check, used in the header and on the login screen. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[28%] bg-gradient-to-br from-[#6d64f0] to-[#3f37c9] text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12.6V4.5A1.5 1.5 0 0 1 4.5 3h8.1a1.5 1.5 0 0 1 1.06.44l6.9 6.9a1.5 1.5 0 0 1 0 2.12l-8.1 8.1a1.5 1.5 0 0 1-2.12 0l-6.9-6.9A1.5 1.5 0 0 1 3 12.6Z" />
        <path d="m8 12 2.5 2.5L15 10" />
      </svg>
    </span>
  );
}
