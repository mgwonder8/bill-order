import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

/** For server components: verifies the signed cookie or sends the visitor to /login. */
export async function requireUser(): Promise<string> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** For route handlers: returns null instead of redirecting, so the caller can send a 401. */
export async function apiUser(): Promise<string | null> {
  return currentUser();
}
