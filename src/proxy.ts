import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Cheap gate only: it checks that a session cookie is present so signed-out
 * visitors land on /login. The signature is verified server side in requireUser(),
 * which every page and API route goes through, because HMAC verification needs
 * node:crypto and this runs on the edge runtime.
 */
export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const hasCookie = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (nextUrl.pathname === "/login") {
    return hasCookie ? NextResponse.redirect(new URL("/", nextUrl)) : NextResponse.next();
  }
  if (!hasCookie) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon\\.ico).*)"],
};
