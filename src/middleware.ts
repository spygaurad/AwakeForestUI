import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/select-org(.*)',
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?s|ts|tsx|map|json|woff2?|eot|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp|avif)).*)',
    '/(api|trpc)(.*)',
  ],
};
