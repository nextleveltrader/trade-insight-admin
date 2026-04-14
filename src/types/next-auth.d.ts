// src/types/next-auth.d.ts
//
// Auth.js v5 TypeScript Module Augmentation
// ─────────────────────────────────────────────────────────────────────────────
// Extends the built-in Session and JWT interfaces so TypeScript knows about
// our custom fields (role, isPro, trialEndsAt) everywhere they are accessed —
// in Server Components, middleware, and client components alike.
//
// Auth.js v5 uses declaration merging on these exact module paths.
// Do NOT change the import paths — they must match exactly.
// ─────────────────────────────────────────────────────────────────────────────

import type { DefaultSession, DefaultUser } from 'next-auth';
import type { JWT as DefaultJWT }           from 'next-auth/jwt';

// ─── Shared payload type ──────────────────────────────────────────────────────
// Centralised so JWT and Session stay in sync without copy-paste drift.

interface CustomUserFields {
  /** DB role: "user" | "admin". Used for route protection in middleware. */
  role:         string;
  /** True when the user holds an active paid Stripe subscription. */
  isPro:        boolean;
  /** UTC epoch-ms when the 14-day free trial expires. Null for pro users. */
  trialEndsAt:  number | null;
}

// ─── Augment next-auth ────────────────────────────────────────────────────────

declare module 'next-auth' {
  /** Extends the `session.user` shape returned by `auth()` / `useSession()`. */
  interface Session {
    user: DefaultSession['user'] & CustomUserFields;
  }

  /**
   * Extends the `User` object returned by the `authorize()` callback and
   * stored in the JWT on first sign-in.
   */
  interface User extends DefaultUser, CustomUserFields {}
}

// ─── Augment next-auth/jwt ────────────────────────────────────────────────────

declare module 'next-auth/jwt' {
  /** Extends the decoded JWT payload so our fields survive round-trips. */
  interface JWT extends DefaultJWT, CustomUserFields {}
}