import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin | Trade Insight Daily",
  description: "AI Automation & Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-white flex`}>
        {/* বাম পাশে সাইডবার */}
        <Sidebar />
        
        {/* ডান পাশে মেইন কন্টেন্ট (ড্যাশবোর্ড) */}
        <main className="flex-1 ml-64 p-8 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}