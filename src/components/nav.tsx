"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Home, Layers, Plus, ScanLine, Tags, Truck } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/customer-orders", label: "Customer orders", short: "Orders", icon: ClipboardList },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/compile", label: "Supplier compile", short: "Compile", icon: Layers },
  { href: "/orders", label: "Supplier orders", icon: Truck },
  { href: "/tags", label: "Saved tags", icon: Tags },
];

const NEW_ORDER = "/customer-orders/new";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const TASKS = [NEW_ORDER, "/orders/new", "/bills/new", "/tags/new"];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      <Link href={NEW_ORDER} className="btn btn-primary mb-4 w-full justify-start px-4">
        <ScanLine size={19} /> Customer order form
      </Link>
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

/** Phone navigation: four sections and a raised + button that opens a new customer order form. */
export function BottomNav() {
  const pathname = usePathname();
  // Task screens have their own action bar at the bottom, so the menu steps aside.
  const focused = TASKS.includes(pathname) || pathname.endsWith("/edit");
  if (focused) return null;

  return (
    <nav className="no-print relative z-20 shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5 items-end">
        {BOTTOM.map((item) => {
          if (!item) {
            return (
              <div key="new" className="flex justify-center">
                <Link
                  href={NEW_ORDER}
                  aria-label="New customer order form"
                  className="-mt-6 mb-1 grid h-[60px] w-[60px] place-items-center rounded-full bg-accent text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
                >
                  <Plus size={28} />
                </Link>
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
  );
}
