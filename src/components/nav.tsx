"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, FileText, Home, PackagePlus, Plus, Receipt, Tags, Truck, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Supplier orders", short: "Orders", icon: ClipboardList },
  { href: "/bills", label: "Customer bills", short: "Bills", icon: FileText },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/supplier", label: "Supplier report", icon: Truck },
  { href: "/tags", label: "Saved tags", icon: Tags },
];

const ACTIONS = [
  { href: "/orders/new", title: "Order from supplier", body: "Scan the supplier's tag. Stock is added.", icon: PackagePlus },
  { href: "/bills/new", title: "Bill a customer", body: "Scan the tag. Make the GST bill from stock.", icon: Receipt },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const TASKS = ["/orders/new", "/bills/new", "/tags/new"];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      <div className="mb-4 grid gap-2">
        {ACTIONS.map(({ href, title, icon: Icon }, i) => (
          <Link key={href} href={href} className={`btn w-full justify-start px-4 ${i === 0 ? "btn-outline" : "btn-primary"}`}>
            <Icon size={19} /> {title}
          </Link>
        ))}
      </div>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href) && !TASKS.includes(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] transition-colors ${
              active ? "bg-accent-soft font-bold text-accent" : "font-medium text-muted hover:bg-black/[0.04] hover:text-foreground"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const BOTTOM = [LINKS[0], LINKS[1], null, LINKS[2], LINKS[3]] as const;

/**
 * Phone navigation: four sections and a raised + button in the middle that asks
 * which job to start: ordering from a supplier or billing a customer.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Task screens have their own action bar at the bottom, so the menu steps aside.
  const focused = TASKS.includes(pathname) || pathname.endsWith("/edit");
  if (focused) return null;

  return (
    <>
      {open && (
        <div className="no-print fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="Start a new job">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="rise absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-extrabold">What do you want to do?</p>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-background" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-3">
              {ACTIONS.map(({ href, title, body, icon: Icon }, i) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 rounded-2xl p-4 ${i === 1 ? "bg-accent text-white" : "border border-line bg-surface"}`}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${i === 1 ? "bg-white/15" : "bg-accent-soft text-accent"}`}>
                    <Icon size={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-extrabold">{title}</span>
                    <span className={`block text-sm ${i === 1 ? "text-white/80" : "text-muted"}`}>{body}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="no-print relative z-20 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5 items-end">
          {BOTTOM.map((item) => {
            if (!item) {
              return (
                <div key="new" className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Start: order from supplier or bill a customer"
                    className="-mt-6 mb-1 grid h-[60px] w-[60px] place-items-center rounded-full bg-accent text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
                  >
                    <Plus size={28} />
                  </button>
                </div>
              );
            }
            const { href, label, icon: Icon } = item;
            const short = "short" in item ? item.short : label;
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[0.7rem] ${active ? "font-bold text-accent" : "font-medium text-muted"}`}>
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
                <span className="leading-none">{short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
