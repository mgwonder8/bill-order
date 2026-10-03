"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, ClipboardList, Tags, Truck } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/supplier", label: "Supplier", icon: Truck },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex md:flex-col gap-1 px-3">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-base transition-colors ${
              active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-black/[0.04] hover:text-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs ${active ? "font-semibold text-accent" : "text-muted"}`}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
              <span className="leading-none">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
