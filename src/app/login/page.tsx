import { redirect } from "next/navigation";
import { checkPasscode, startSession } from "@/lib/auth";
import { shop } from "@/lib/shop";
import { LoginForm } from "./login-form";

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
  return <LoginForm action={signIn} failed={failed} shopName={shop.name} />;
}
