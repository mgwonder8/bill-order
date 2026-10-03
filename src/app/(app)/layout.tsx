import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { endSession } from "@/lib/auth";
import { BottomNav, SideNav } from "@/components/nav";

async function signOut() {
  "use server";
  await endSession();
  redirect("/login");
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[228px_1fr]">
      <aside className="no-print hidden md:flex md:flex-col md:border-r md:border-line md:bg-surface md:sticky md:top-0 md:h-dvh py-5">
        <Link href="/" className="flex items-center gap-2.5 px-6 pb-6">
          <span className="h-8 w-8 rounded-lg bg-foreground text-background grid place-items-center text-sm font-semibold">
            T
          </span>
          <span className="font-semibold tracking-tight">TagBill</span>
        </Link>
        <SideNav />
        <div className="mt-auto px-6 pt-5">
          <p className="text-xs text-muted">Signed in as</p>
          <p className="text-sm font-medium">{user}</p>
          <form action={signOut}>
            <button type="submit" className="mt-2 text-xs text-muted underline underline-offset-2 hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="no-print md:hidden sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="h-7 w-7 rounded-lg bg-foreground text-background grid place-items-center text-xs font-semibold">
              T
            </span>
            TagBill
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-xs text-muted">
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:py-8 md:pb-10">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
