import { NextResponse, type NextRequest } from "next/server";

/**
 * The dashboard has no landing page: `/` redirects straight to the console.
 * Unauthenticated visitors are bounced onward to `/login` by the admin
 * layout; members land directly in `/dashboard`.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
