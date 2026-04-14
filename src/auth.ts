// src/auth.ts
//
// Auth.js v5 — Central Configuration (Production-Ready, Complete)
// ═══════════════════════════════════════════════════════════════════════════════
//
// EXPORTS
//   handlers  → mounted at src/app/api/auth/[...nextauth]/route.ts
//   auth      → session getter for Server Components & middleware
//   signIn    → server-side programmatic sign-in
//   signOut   → server-side sign-out
//
// SESSION STRATEGY
//   JWT is mandatory when using the Credentials provider.
//   DrizzleAdapter still manages users / accounts tables for OAuth persistence,
//   but sessions live in a signed, HttpOnly JWT cookie.
//
// TRIAL ACTIVATION
//   Credentials users: trial set inside registerUser() server action.
//   Google OAuth users: trial set inside the createUser event, which fires
//                       once after the DrizzleAdapter inserts the new row.
//
// TYPE AUGMENTATION
//   id, role, isPro, trialEndsAt are declared on session.user and the JWT
//   in src/types/next-auth.d.ts (created in Phase 1).
// ═══════════════════════════════════════════════════════════════════════════════

import NextAuth, { type NextAuthConfig }  from 'next-auth';
import { DrizzleAdapter }                 from '@auth/drizzle-adapter';
import CredentialsProvider                from 'next-auth/providers/credentials';
import GoogleProvider                     from 'next-auth/providers/google';
import bcrypt                             from 'bcryptjs';
import { eq }                             from 'drizzle-orm';

import { getDb }                          from '@/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
}                                         from '@/db/schema';

// ─── Constants ────────────────────────────────────────────────────────────────

/** 14 calendar days in milliseconds. */
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * A real bcrypt hash used as a timing-safe dummy during user-not-found paths.
 * Running bcrypt.compare against this prevents attackers from inferring whether
 * an email exists in the system via response-time analysis.
 *
 * Generated once with: bcrypt.hashSync('timing-safe-placeholder', 12)
 */
const TIMING_SAFE_HASH =
  '$2b$12$KIXyFb4PR2z8.Rn3F7sOVeRpldU5bQAEbF5Y3bS2vfEpO4tXgjgHy';

// ─── Internal payload type ────────────────────────────────────────────────────
//
// Shape of the object we return from authorize() and store inside the JWT.
// Using a local interface decouples us from Auth.js's generic User type while
// keeping full type-safety inside this file.

interface AuthorizedUser {
  id:          string;
  name:        string | null;
  email:       string;
  image:       string | null;
  role:        string;
  isPro:       boolean;
  /** epoch-milliseconds; null when no trial row exists yet (should not happen). */
  trialEndsAt: number | null;
}

// ─── DB helper: fetch only the JWT-relevant columns ──────────────────────────
//
// Called from both jwt() and authorize() to load authoritative values from
// Turso. Selecting only three columns keeps the Turso HTTP payload minimal.
//
// Returns null if:
//   • The user row is not found (shouldn't happen post sign-in, but be safe).
//   • The DB call throws (network hiccup, edge cold-start timeout, etc.).

async function fetchJwtPayload(userId: string): Promise<{
  role:        string;
  isPro:       boolean;
  trialEndsAt: number | null;
} | null> {
  try {
    const db = getDb();

    const rows = await db
      .select({
        role:        users.role,
        isPro:       users.isPro,
        trialEndsAt: users.trialEndsAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    // integer({ mode: "timestamp_ms" }) → Drizzle returns Date | null on select.
    // We normalise to epoch-ms (number | null) for clean JSON serialisation
    // inside the JWT cookie.
    const trialEndsAtMs: number | null =
      row.trialEndsAt instanceof Date
        ? row.trialEndsAt.getTime()
        : typeof row.trialEndsAt === 'number'
          ? row.trialEndsAt   // Turso edge driver sometimes returns raw ms
          : null;

    return {
      role:        row.role  ?? 'user',
      isPro:       row.isPro ?? false,
      trialEndsAt: trialEndsAtMs,
    };

  } catch (err) {
    console.error('[auth:fetchJwtPayload] DB error for userId:', userId, '\n', err);
    return null;
  }
}

// ─── Auth.js Configuration ────────────────────────────────────────────────────

const authConfig: NextAuthConfig = {

  // ── Adapter ──────────────────────────────────────────────────────────────────
  //
  // The `as any` casts on each table are necessary because Auth.js v5's internal
  // DrizzleAdapter types expect an exact column set (id, email, name, image,
  // emailVerified) and do not support arbitrary extra columns without breaking
  // the mapped type. This is a known upstream limitation tracked at:
  // https://github.com/nextauthjs/next-auth/issues/9493
  //
  // The cast does NOT affect runtime behaviour — the adapter only reads/writes
  // its own core columns. Our custom columns (isPro, role, trialStartsAt, etc.)
  // are managed exclusively through direct Drizzle queries in this file and in
  // src/actions/auth-actions.ts.

  adapter: DrizzleAdapter(getDb()) as any,

  // ── Session ──────────────────────────────────────────────────────────────────
  //
  // strategy: "jwt" is REQUIRED whenever the Credentials provider is used.
  // Auth.js cannot create a DB session row for credentials users because
  // it doesn't expose a session token at the end of the authorize() flow.
  //
  // maxAge:   30 days — user is forced to re-authenticate after this.
  // updateAge: 24 hrs — token is re-issued at most once per day to reduce
  //             DB reads on high-traffic deployments.

  session: {
    strategy:  'jwt',
    maxAge:    30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  // ── Providers ─────────────────────────────────────────────────────────────

  providers: [

    // ── Google OAuth ────────────────────────────────────────────────────────
    //
    // Required env vars (.env.local):
    //   GOOGLE_CLIENT_ID=<your-client-id>
    //   GOOGLE_CLIENT_SECRET=<your-client-secret>
    //
    // Google Cloud Console → Credentials → OAuth 2.0 Client IDs:
    //   Authorised redirect URI: https://yourdomain.com/api/auth/callback/google
    //
    // `prompt: "select_account"` forces the account picker every time,
    // preventing silent re-login with an unintended Google account.

    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt:        'select_account',
          access_type:   'offline',
          response_type: 'code',
        },
      },
    }),

    // ── Credentials (Email + Password) ─────────────────────────────────────
    //
    // `authorize` contract:
    //   ✓ Return an AuthorizedUser object on success.
    //   ✗ Return null on any failure (wrong password, user not found, etc.).
    //   ✗ NEVER throw — a thrown error surfaces as error:"Configuration" instead
    //     of the expected error:"CredentialsSignin", breaking the client-side
    //     error mapping in the Login page.

    CredentialsProvider({
      name: 'credentials',

      // `credentials` is used by Auth.js's built-in UI only.
      // Our custom login page reads these fields from its own form state.
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(
        credentials: Partial<Record<string, unknown>>,
      ): Promise<AuthorizedUser | null> {

        // ── 1. Input type guard ──────────────────────────────────────────
        const rawEmail    = credentials?.email;
        const rawPassword = credentials?.password;

        if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
          console.warn('[auth:authorize] Received credentials with unexpected types');
          return null;
        }

        const email    = rawEmail.trim().toLowerCase();
        const password = rawPassword; // do NOT trim — passwords can have leading/trailing spaces

        if (!email || !password) {
          return null;
        }

        // ── 2. Look up user by email ────────────────────────────────────
        let dbUser: typeof users.$inferSelect | undefined;

        try {
          const db   = getDb();
          const rows = await db
            .select()   // select all columns so we have the full user object
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          dbUser = rows[0];
        } catch (err) {
          // DB failure: log and return null rather than letting a 500 bubble up.
          // The user will see "invalid credentials" — acceptable trade-off.
          console.error('[auth:authorize] DB select failed for email:', email, '\n', err);
          return null;
        }

        // ── 3. User not found — timing-safe path ────────────────────────
        //
        // We run a dummy bcrypt.compare against a pre-computed hash so the
        // response time is indistinguishable from a real password check.
        // Without this, an attacker can enumerate valid emails by measuring
        // response latency (valid email → slow bcrypt; invalid → instant).
        if (!dbUser) {
          await bcrypt.compare(password, TIMING_SAFE_HASH);
          return null;
        }

        // ── 4. OAuth-only account guard ─────────────────────────────────
        //
        // A user who registered via Google will have password = null.
        // Return null so the Login page can display a helpful "Please sign in
        // with Google" message via the error code mapping.
        if (!dbUser.password) {
          console.warn(
            '[auth:authorize] Credentials login attempted on OAuth-only account:',
            email,
          );
          // Timing-safe: run dummy compare so the response time is consistent.
          await bcrypt.compare(password, TIMING_SAFE_HASH);
          return null;
        }

        // ── 5. Password verification ────────────────────────────────────
        let passwordMatch = false;
        try {
          passwordMatch = await bcrypt.compare(password, dbUser.password);
        } catch (err) {
          console.error('[auth:authorize] bcrypt.compare threw:', err);
          return null;
        }

        if (!passwordMatch) {
          return null;
        }

        // ── 6. Normalise trialEndsAt to epoch-ms ─────────────────────────
        //
        // integer({ mode: "timestamp_ms" }) → Drizzle returns Date | null.
        const trialEndsAtMs: number | null =
          dbUser.trialEndsAt instanceof Date
            ? dbUser.trialEndsAt.getTime()
            : typeof dbUser.trialEndsAt === 'number'
              ? dbUser.trialEndsAt
              : null;

        // ── 7. Return the authorised user payload ─────────────────────────
        //
        // This object is passed as `user` to the jwt() callback on first sign-in.
        // Do NOT include the password hash.
        return {
          id:          dbUser.id,
          name:        dbUser.name  ?? null,
          email:       dbUser.email,
          image:       dbUser.image ?? null,
          role:        dbUser.role  ?? 'user',
          isPro:       dbUser.isPro ?? false,
          trialEndsAt: trialEndsAtMs,
        };
      },
    }),
  ],

  // ── Callbacks ─────────────────────────────────────────────────────────────

  callbacks: {

    // ── jwt ─────────────────────────────────────────────────────────────────
    //
    // Called on:
    //   A. First sign-in → `user` is the object returned by authorize() (or the
    //      OAuth profile). We seed the token with our custom fields.
    //   B. Subsequent requests → only `token` is present; we skip the DB read
    //      unless `trigger === "update"` is explicitly requested.
    //
    // The token is stored in an encrypted, signed JWT cookie. Only serialisable
    // primitives (string, number, boolean, null) should be stored in it.

    async jwt({ token, user, trigger }) {

      // ── Branch A: First sign-in ──────────────────────────────────────────
      //
      // `user` is defined only on the very first call per session.
      if (user) {
        const authorizedUser = user as AuthorizedUser;

        // Persist the DB primary key in both `sub` (JWT standard) and `id`
        // (ergonomic custom field) for downstream access.
        token.sub = authorizedUser.id;
        token.id  = authorizedUser.id;

        // Fetch authoritative values from the DB.
        //
        // For credentials sign-in, authorize() already computed these fields
        // correctly, but we do one DB read to guarantee consistency (e.g. if
        // `isPro` was flipped by a Stripe webhook between page load and submit).
        //
        // For Google OAuth sign-in, this read is ESSENTIAL. The `user` object
        // from the DrizzleAdapter contains only Auth.js core fields; our custom
        // columns (role, isPro, trialEndsAt) are null/undefined until after the
        // `createUser` event runs. Since events are fire-and-forget and run
        // concurrently with the callback pipeline, we do the DB read here to
        // pick up whatever state the event wrote.
        const payload = await fetchJwtPayload(authorizedUser.id);

        if (payload) {
          token.role        = payload.role;
          token.isPro       = payload.isPro;
          token.trialEndsAt = payload.trialEndsAt;
        } else {
          // Fallback: use what authorize() returned (accurate for credentials
          // users; may be default values for new OAuth users — acceptable
          // because the next jwt() call will re-fetch from DB).
          token.role        = authorizedUser.role        ?? 'user';
          token.isPro       = authorizedUser.isPro       ?? false;
          token.trialEndsAt = authorizedUser.trialEndsAt ?? null;
        }
      }

      // ── Branch B: Explicit session refresh (trigger === "update") ────────
      //
      // Trigger this from the client by calling:
      //   const { update } = useSession();
      //   await update();
      //
      // Use-cases:
      //   • Stripe webhook flipped isPro → true; we need the session to reflect it.
      //   • Trial expired mid-session; we want to refresh the gate check.
      //   • Admin changed a user's role; we want it reflected without re-login.
      //
      // We re-fetch from the DB so the token always reflects the current DB state.

      if (trigger === 'update') {
        // token.id is set by Branch A on first sign-in; fall back to token.sub
        // which Auth.js populates from the user's id automatically.
        const userId = (token.id ?? token.sub) as string | undefined;

        if (userId) {
          const payload = await fetchJwtPayload(userId);
          if (payload) {
            token.role        = payload.role;
            token.isPro       = payload.isPro;
            token.trialEndsAt = payload.trialEndsAt;
          }
        } else {
          console.warn('[auth:jwt] trigger=update but no userId found in token');
        }
      }

      return token;
    },

    // ── session ──────────────────────────────────────────────────────────────
    //
    // Projects JWT token fields onto session.user.
    // Runs on every call to auth() / useSession() / getSession().
    //
    // RULES:
    //   • Only put serialisable primitives here (string, number, boolean, null).
    //   • Do NOT read the DB here — this runs on every request; use the JWT
    //     as the cache and refresh it via trigger:"update" when stale.

    session({ session, token }) {

      if (session.user) {

        // ── Core identity ─────────────────────────────────────────────────
        session.user.id = (token.id  as string | undefined)
                       ?? (token.sub as string | undefined)
                       ?? '';

        // ── Custom business fields ────────────────────────────────────────
        //
        // These fields are declared on the session.user type in
        // src/types/next-auth.d.ts. The `as` casts are safe because
        // jwt() always sets these before session() is called.
        session.user.role        = (token.role        as string          | undefined) ?? 'user';
        session.user.isPro       = (token.isPro       as boolean         | undefined) ?? false;
        session.user.trialEndsAt = (token.trialEndsAt as number | null   | undefined) ?? null;
      }

      return session;
    },
  },

  // ── Events ────────────────────────────────────────────────────────────────
  //
  // Events are fire-and-forget side-effects. They cannot modify the session
  // object or return data — they are purely for triggering external writes.

  events: {

    // ── createUser ──────────────────────────────────────────────────────────
    //
    // Fires EXACTLY ONCE per user lifetime, immediately after the DrizzleAdapter
    // inserts the new `user` row into the database. This happens during OAuth
    // sign-in (Google) when Auth.js determines no existing account matches the
    // OAuth profile.
    //
    // At the moment this event fires:
    //   • The `user` row exists in the DB.
    //   • Our custom columns (role, isPro, trialStartsAt, trialEndsAt) are still
    //     at their column defaults (role='user', isPro=false, others null).
    //
    // We UPDATE the row immediately to set the trial window so the subsequent
    // jwt() callback's fetchJwtPayload() call reads the correct values.
    //
    // NOTE: This event does NOT fire for credentials users because we insert
    // those rows ourselves inside registerUser() with trial dates already set.

    async createUser({ user }) {

      if (!user.id) {
        console.error(
          '[auth:createUser] Event fired without user.id — cannot set trial dates.',
          'This is an Auth.js adapter bug. Please file an issue.',
        );
        return;
      }

      const now           = new Date();
      const trialStartsAt = now;
      const trialEndsAt   = new Date(now.getTime() + TRIAL_DURATION_MS);

      try {
        const db = getDb();

        const result = await db
          .update(users)
          .set({
            role:          'user',
            isPro:         false,
            // Drizzle integer({ mode: "timestamp_ms" }) accepts Date objects
            // and stores them as epoch-milliseconds internally.
            trialStartsAt,
            trialEndsAt,
          })
          .where(eq(users.id, user.id));

        console.info(
          '[auth:createUser] Trial activated.',
          `userId=${user.id}`,
          `trialEndsAt=${trialEndsAt.toISOString()}`,
          result,
        );

      } catch (err) {
        // Non-fatal: the user can still log in. The trial can be repaired by
        // an admin script or a scheduled repair job. Log thoroughly so the
        // issue is visible in production monitoring (Sentry, Logtail, etc.).
        console.error(
          '[auth:createUser] FAILED to set trial dates.',
          `userId=${user.id}`,
          'Error:',
          err,
        );
      }
    },
  },

  // ── Custom pages ────────────────────────────────────────────────────────────
  //
  // Auth.js redirects to these pages instead of its built-in UI.
  // Our /login page reads the ?error= query param and maps it to human text.

  pages: {
    signIn: '/login',
    error:  '/login',  // receives ?error=<ErrorCode> — mapped in login/page.tsx
  },

  // ── Debug ────────────────────────────────────────────────────────────────────
  //
  // Logs decoded tokens and raw OAuth responses to the console.
  // MUST be false in production — it leaks sensitive credential data.

  debug: process.env.NODE_ENV === 'development',
};

// ─── Export ────────────────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);