import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const path = request.nextUrl.pathname;
  const isPrivate = path.startsWith("/dashboard") ||
    path.startsWith("/settings") ||
    path.startsWith("/admin");

  if (isPrivate && !token?.sub) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (path.startsWith("/admin") &&
      !["ADMIN", "SECURITY_ADMIN"].includes(String(token?.role ?? ""))) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*"],
};
