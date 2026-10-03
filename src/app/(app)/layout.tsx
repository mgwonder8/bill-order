import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/session";
import { endSession } from "@/lib/auth";
import { shop } from "@/lib/shop";
import { BottomNav, SideNav } from "@/components/nav";
import { BrandMark } from "@/components/ui";

async function signOut() {
  "use server";
  await endSession();
  redirect("/login");
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold uppercase text-accent">
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    // App shell: the document never scrolls, only <main> does, so the header and the
    // bottom menu are ordinary layout rows that cannot drift on phone browsers.
    <div className="app-shell flex h-dvh flex-col md:grid md:grid-cols-[248px_1fr]">
      <aside className="no-print hidden h-dvh flex-col border-r border-line bg-surface py-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-5">
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-[1.05rem] font-extrabold tracking-tight">TagBill</span>
            <span className="block truncate text-xs text-muted">{shop.name}</span>
          </span>
        </Link>
        <SideNav />
        <div className="mx-3 mt-auto flex items-center gap-3 rounded-xl border border-line p-3">
          <Avatar name={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-black/[0.05] hover:text-foreground" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>

      <div className="app-shell flex min-h-0 min-w-0 flex-1 flex-col md:h-dvh">
        <header className="no-print z-10 flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5 md:hidden">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={32} />
            <span className="min-w-0">
              <span className="block text-base font-extrabold leading-tight tracking-tight">TagBill</span>
              <span className="block truncate text-[0.7rem] leading-tight text-muted">{shop.name}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Avatar name={user} />
            <form action={signOut}>
              <button type="submit" className="grid h-10 w-10 place-items-center rounded-lg text-muted active:bg-black/[0.05]" aria-label="Sign out">
                <LogOut size={19} />
              </button>
            </form>
          </div>
        </header>

        <main className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-10 md:px-8 md:py-8">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
