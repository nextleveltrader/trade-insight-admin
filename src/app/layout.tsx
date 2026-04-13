import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trade Insight Daily", // এখানে "Admin" সরিয়ে সাইটের নাম দিন
  description: "Market Analysis & AI Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-white`}>
        {/* এখানে কোনো Sidebar বা ConditionalLayout থাকবে না */}
        {children} 
      </body>
    </html>
  );
}