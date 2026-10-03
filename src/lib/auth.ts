import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * One shared passcode for the shop, held in a signed HttpOnly cookie. Deliberately
 * small: this is a single tenant tool for one store's staff, so there is no user
 * directory to maintain. Swap this module for a real provider before opening it up
 * to multiple stores.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(value: string): string {
  return createHmac("sha256", env.authSecret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function makeToken(user: string): string {
  const payload = `${user}.${Date.now()}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const payload = Buffer.from(encoded, "base64url").toString();
  if (!safeEqual(sign(payload), signature)) return null;
  return payload.split(".")[0] || null;
}

export function checkPasscode(input: string): boolean {
  return safeEqual(input.trim(), env.appPasscode);
}

export async function currentUser(): Promise<string | null> {
  const jar = await cookies();
  return verifyToken(jar.get(SESSION_COOKIE)?.value);
}

export async function startSession(user: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

