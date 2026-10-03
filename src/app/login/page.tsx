import { redirect } from "next/navigation";
import { checkPasscode, startSession } from "@/lib/auth";

export const metadata = { title: "Sign in to TagBill" };

async function signIn(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim() || "Staff";
  const passcode = String(formData.get("passcode") ?? "");
  if (!checkPasscode(passcode)) redirect("/login?error=1");
  await startSession(name);
  redirect("/");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const failed = (await searchParams).error === "1";

  return (
    <main className="min-h-dvh grid place-items-center px-5 py-12">
      <div className="w-full max-w-sm rise">
        <div className="mb-8">
          <div className="h-11 w-11 rounded-xl bg-foreground text-background grid place-items-center font-semibold text-lg">
            T
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">TagBill</h1>
          <p className="mt-1.5 text-sm text-muted">
            Scan tags, take orders, make GST bills, send supplier reports.
          </p>
        </div>

        <form action={signIn} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-4">
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" className="field" placeholder="e.g. Ravi" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="passcode">
              Shop passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              type="password"
              className="field"
              required
              autoComplete="current-password"
            />
          </div>

          {failed && (
            <p className="mt-3 text-sm text-accent">That passcode is not right. Try again.</p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs text-muted">
          Everyone in the shop shares one passcode. Your name is only used to stamp who scanned or billed what.
        </p>
      </div>
    </main>
  );
}
