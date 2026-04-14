// src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth; // Auth.js ইউজার লগইন চেক
  const user = req.auth?.user;

  // ─── ১. অ্যাডমিন প্যানেল লজিক (আপনার আগের কাস্টম কুকি সিস্টেম) ──────────
  if (nextUrl.pathname.startsWith('/admin')) {
    const isAdminLoginPage = nextUrl.pathname === '/admin/login';
    const hasAdminCookie = req.cookies.has('admin_session');

    // অ্যাডমিন লগইন করা না থাকলে লগইন পেজে পাঠান
    if (!hasAdminCookie && !isAdminLoginPage) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // লগইন করা থাকলে লগইন পেজে ঢুকতে বাধা দিন
    if (hasAdminCookie && isAdminLoginPage) {
      return NextResponse.redirect(new URL('/admin/posts', req.url));
    }
    return NextResponse.next();
  }

  // ─── ২. ইউজার অ্যাপ লজিক (Auth.js + Freemium Logic) ──────────────────
  
  // প্রটেক্টড রুটস (যেখানে লগইন ছাড়া ঢোকা যাবে না)
  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
  const protectedRoutes = ['/feed', '/calendar', '/saved', '/insights'];
  const isUserProtectedRoute = protectedRoutes.some(path => nextUrl.pathname.startsWith(path));

  // লগইন না করে প্রটেক্টড পেজে গেলে লগইন পেজে পাঠিয়ে দিন
  if (isUserProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // লগইন করা ইউজার লগইন পেজে যেতে চাইলে ফিডে পাঠান
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/feed', req.url));
  }

  // [ভবিষ্যতের জন্য]: এখানে ট্রায়াল শেষ হয়েছে কি না তা চেক করে 
  // আপনি চাইলে ইউজারকে /pricing পেজেও পাঠাতে পারেন।
  /*
  const now = Date.now();
  if (isLoggedIn && !user?.isPro && user?.trialEndsAt && now > user.trialEndsAt) {
     if (isUserProtectedRoute && nextUrl.pathname !== '/pricing') {
        return NextResponse.redirect(new URL('/pricing', req.url));
     }
  }
  */

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};