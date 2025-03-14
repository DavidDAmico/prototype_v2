import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Da wir nun Cookie-basierte Tokens verwenden, prüfen wir das Vorhandensein des Access-Token-Cookies
  const token = req.cookies.get("access_token_cookie")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
