import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define the strictly protected routes (The Command Center)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', // Protects /dashboard and anything inside it
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. If the user tries to access a protected route, force them to log in
  if (isProtectedRoute(req)) {
    await auth.protect();
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
