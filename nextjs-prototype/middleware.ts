import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return fetch("http://localhost:5001/auth/protected", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Invalid token");
      return res.json();
    })
    .then((data) => {
      if (req.nextUrl.pathname.startsWith("/admin") && data.user.role !== "master") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    })
    .catch(() => NextResponse.redirect(new URL("/login", req.url)));
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
