import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth; // ইউজার লগইন করা থাকলে এটি true হবে

  // ১. চেক করছি ইউজার কোন পেজে যেতে চাচ্ছে
  const isLoginPage = nextUrl.pathname.startsWith('/admin/login');
  
  // আমরা /admin এর সব পেজ প্রটেক্ট করব, শুধু login পেজ বাদে
  const isAdminRoute = nextUrl.pathname.startsWith('/admin') && !isLoginPage;
  
  // ভবিষ্যতের জন্য ইউজার ড্যাশবোর্ডও প্রটেক্ট করে রাখলাম
  const isUserDashboardRoute = nextUrl.pathname.startsWith('/dashboard');

  const isProtectedRoute = isAdminRoute || isUserDashboardRoute;

  // ২. যদি প্রটেক্টেড পেজে যেতে চায় কিন্তু লগইন করা না থাকে
  if (isProtectedRoute && !isLoggedIn) {
    // তাকে লগইন পেজে পাঠিয়ে দিন
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // ৩. যদি অলরেডি লগইন করা থাকে এবং আবার লগইন পেজে যায়
  if (isLoginPage && isLoggedIn) {
    // তাকে সোজা অ্যাডমিন প্যানেলে পাঠিয়ে দিন
    return NextResponse.redirect(new URL('/admin/posts', req.url));
  }

  // ৪. এছাড়া বাকি সব পেজ (যেমন: /, /blog) সবার জন্য উন্মুক্ত থাকবে
  return NextResponse.next();
});

// এই ম্যাচারটি নিশ্চিত করবে যে মিডলওয়্যার শুধু পেজগুলোর ওপর কাজ করবে, 
// কোনো ইমেজ বা স্ট্যাটিক ফাইলের ওপর নয় (NextAuth এর স্ট্যান্ডার্ড নিয়ম)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};