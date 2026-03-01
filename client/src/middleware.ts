import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. Define the Route Parameters
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // 2. Protect the /admin route
  if (isAdminRoute(req)) {
    // If not logged in, or if logged in but lacking the "admin" role
    if (!userId || sessionClaims?.metadata?.role !== 'admin') {
      // Bounce them back to the main dashboard
      const url = new URL('/dashboard', req.url);
      return NextResponse.redirect(url);
    }
  }

  // 3. STANDARD GATE: Protect the /dashboard workspace
  if (isProtectedRoute(req)) {
    if (!userId) {
      await auth.protect();
    }
  }
});

export const config = {
  matcher:[
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
