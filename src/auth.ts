import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db"; // <-- DB এর বদলে getDb ফাংশনটি ইম্পোর্ট করা হলো
import Google from "next-auth/providers/google";

// ফাংশনটি কল করে আসল ডাটাবেস কানেকশনটি db ভেরিয়েবলে নেওয়া হলো
const db = getDb(); 

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db), // <-- এবার এখানে db ব্যবহার করা হলো
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // @ts-ignore
        session.user.role = user.role; 
      }
      return session;
    },
  },
});