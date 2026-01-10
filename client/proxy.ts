import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|auth|_next/static|_next/image|.*\\.png$).*)",
  ],
};

export async function proxy(request: NextRequest) {

  const sessionCookie = getSessionCookie(request);

  if(!sessionCookie){
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  return NextResponse.next();

}