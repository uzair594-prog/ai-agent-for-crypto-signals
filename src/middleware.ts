import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const isPrivate = request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/admin");
  if (isPrivate && !request.auth?.user?.id) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (request.nextUrl.pathname.startsWith("/admin") &&
      !["ADMIN", "SECURITY_ADMIN"].includes(request.auth?.user?.role ?? "")) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*"],
};
