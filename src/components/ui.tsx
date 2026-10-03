import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
  step,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  step?: number;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {step && <StepBadge n={step} />}
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StepBadge({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent font-bold text-white ${
        small ? "h-7 w-7 text-sm" : "mt-1 h-9 w-9 text-base"
      }`}
    >
      {n}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-sm ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tnum tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <Card className="p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-base text-muted">{body}</p>
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
    ok: "bg-ok/10 text-ok",
    muted: "bg-black/[0.06] text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn/10 text-warn",
  } as const;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ${tones[tone]}`}>
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
