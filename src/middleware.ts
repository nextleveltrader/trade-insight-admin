// src/middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
// Auth.js v5 edge middleware.
//
// Route protection tiers (PROJECT_STATE.md §1):
//
//   /admin/*         → separate HMAC cookie system (admin_session)
//   /login           → redirect to /feed if already logged in
//   /register        → redirect to /feed if already logged in
//   /feed            ┐
//   /calendar        │ protected routes — require login
//   /saved           │ AND active access (isPro || trial not expired)
//   /insights/*      ┘
//
// Trial expiry logic:
//   If isLoggedIn && !isPro && trialEndsAt is set && trialEndsAt < now
//   → redirect to /pricing (unless already on /pricing or /upgrade)
//
// IMPORTANT: The JWT session is populated by Auth.js `session()` callback in
// src/auth.ts, which projects `isPro` and `trialEndsAt` onto `session.user`.
// Those fields are defined in src/types/next-auth.d.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { auth }          from "@/auth";
import { NextResponse }  from "next/server";

export default auth((req) => {
  const { nextUrl } = req;

  // ── Strict session check ───────────────────────────────────────────────────
  // A non-null req.auth alone isn't enough — on Vercel it can be an empty
  // object.  We require req.auth.user to be present (the user ID must exist).
  const isLoggedIn  = !!req.auth?.user?.id;
  const user        = req.auth?.user;

  // ── 1. Admin panel logic ───────────────────────────────────────────────────
  if (nextUrl.pathname.startsWith("/admin")) {
    const isAdminLoginPage = nextUrl.pathname === "/admin/login";
    const hasAdminCookie   = req.cookies.has("admin_session");

    if (!hasAdminCookie && !isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (hasAdminCookie && isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin/posts", req.url));
    }
    return NextResponse.next();
  }

  // ── 2. Auth pages (login / register) ──────────────────────────────────────
  const isAuthPage = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
    return NextResponse.next();
  }

  // ── 3. Protected user routes ───────────────────────────────────────────────
  const isProtectedRoute = ["/feed", "/calendar", "/saved", "/insights"].some(
    (path) => nextUrl.pathname.startsWith(path),
  );

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── 4. Trial expiry enforcement ────────────────────────────────────────────
  //
  // If the user is logged in but their trial has expired AND they have no
  // active Pro subscription, bounce them to /pricing.
  //
  // Exempt paths that are safe to visit while expired:
  //   /pricing  — the upgrade page itself
  //   /upgrade  — alternative upgrade CTA page
  //
  // The fields `isPro` and `trialEndsAt` are stamped onto the JWT in
  // src/auth.ts → jwt() callback via fetchJwtPayload() and are available
  // here as req.auth.user.* (projected by the session() callback).

  if (isLoggedIn && isProtectedRoute) {
    const isPro       = user?.isPro       ?? false;
    const trialEndsAt = user?.trialEndsAt ?? null;
    const now         = Date.now();

    const isTrialExpired =
      !isPro &&
      trialEndsAt !== null &&
      now >= trialEndsAt;

    if (isTrialExpired) {
      const exemptPaths = ["/pricing", "/upgrade"];
      const isExempt    = exemptPaths.some((p) => nextUrl.pathname.startsWith(p));

      if (!isExempt) {
        return NextResponse.redirect(new URL("/pricing", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};