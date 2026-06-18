import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = [
  "/auth",
  "/invite",
  "/api/auth",
  "/api/invite",
  "/_next",
];

const PUBLIC_EXACT = ["/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (PUBLIC_EXACT.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  if (pathname === "/favicon.ico") return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Block non-admins from /upload
  if (pathname.startsWith("/upload") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
