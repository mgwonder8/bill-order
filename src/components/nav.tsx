"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ClipboardList, FileText, Home, Tags, Truck } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/supplier", label: "Supplier", icon: Truck },
  { href: "/tags", label: "Saved tags", icon: Tags },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      <Link href="/orders/new" className="btn btn-primary mb-4 w-full justify-start px-4">
        <Camera size={19} /> Scan a tag
      </Link>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href) && pathname !== "/orders/new";
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

/** Phone navigation: four sections with a raised camera button in the middle for the main job. */
export function BottomNav() {
  const pathname = usePathname();
  const scanning = pathname === "/orders/new" || pathname === "/tags/new";
  // Task screens have their own sticky action bar at the bottom, so the menu steps aside.
  const focused = scanning || pathname === "/bills/new" || pathname.endsWith("/edit");
  if (focused) return null;
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 items-end">
        {BOTTOM.map((item) => {
          if (!item) {
            return (
              <div key="scan" className="flex justify-center">
                <Link
                  href="/orders/new"
                  aria-label="Scan a tag"
                  className={`-mt-6 mb-1 grid h-[60px] w-[60px] place-items-center rounded-full text-white shadow-lg ring-4 ring-background transition-transform active:scale-95 ${
                    scanning ? "bg-accent-strong" : "bg-accent"
                  }`}
                >
                  <Camera size={26} />
                </Link>
              </div>
            );
          }
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, href) && !scanning;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[0.7rem] ${active ? "font-bold text-accent" : "font-medium text-muted"}`}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
