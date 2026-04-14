// src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  
  // 🔴 STRICT CHECK: শুধুমাত্র req.auth নয়, আমরা চেক করছি req.auth.user আছে কি না।
  // প্রোডাকশনে (Vercel) ফাঁকা অবজেক্টের কারণে যে রিডাইরেক্ট বাগ হয়, এটি তা ফিক্স করবে।
  const isLoggedIn = !!req.auth?.user; 
  const user = req.auth?.user;

  // ─── ১. অ্যাডমিন প্যানেল লজিক ───────────────────────────────────────────
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

  // ─── ২. ইউজার অ্যাপ লজিক ──────────────────────────────────────────────
  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
  const isProtectedRoute = ['/feed', '/calendar', '/saved', '/insights'].some(path => 
    nextUrl.pathname.startsWith(path)
  );

  // যদি ইউজার লগইন/রেজিস্টার পেজে যায়:
  if (isAuthPage) {
    if (isLoggedIn) {
      // লগইন করা থাকলে ফিডে পাঠাও
      return NextResponse.redirect(new URL('/feed', req.url));
    }
    // লগইন করা না থাকলে পেজটি দেখতে দাও!
    return NextResponse.next(); 
  }

  // যদি লগইন না করে প্রটেক্টেড পেজে (যেমন /feed) যেতে চায়:
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // [ভবিষ্যতের জন্য ট্রায়াল চেকিং লজিক]
  /*
  const now = Date.now();
  if (isLoggedIn && !user?.isPro && user?.trialEndsAt && now > user.trialEndsAt) {
     if (isProtectedRoute && nextUrl.pathname !== '/pricing') {
        return NextResponse.redirect(new URL('/pricing', req.url));
     }
  }
  */

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};