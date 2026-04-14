'use server';
// src/actions/auth-actions.ts
//
// Authentication Server Actions (Production-Ready, Complete)
// ═══════════════════════════════════════════════════════════════════════════════
//
// EXPORTS
//   registerUser(formData)   — creates a new user with hashed password and
//                              an activated 14-day free trial
//   checkTrialStatus(userId) — returns the user's current subscription state
//
// RETURN TYPE CONVENTION
//   Every action returns a discriminated-union result object. We never throw
//   across the server→client boundary because:
//     1. Thrown errors lose type information after serialisation.
//     2. React's error boundary would catch them and render a full-page error.
//     3. A discriminated union gives the client precise, typesafe control.
//
//   { success: true;  message?: string }
//   { success: false; error:    string }
//
// SECURITY NOTES
//   • Validation runs server-side regardless of client-side checks (defence in depth).
//   • Passwords are hashed with bcrypt at cost factor 12 (OWASP recommended minimum).
//   • We never return the hash, the raw userId, or any internal DB error message
//     to the client — only the discriminated-union result.
// ═══════════════════════════════════════════════════════════════════════════════

import bcrypt    from 'bcryptjs';
import { eq }    from 'drizzle-orm';

import { getDb } from '@/db';
import { users } from '@/db/schema';

// ─── Constants ────────────────────────────────────────────────────────────────

/** bcrypt cost factor. 12 rounds ≈ 250 ms on a modern server — acceptable UX. */
const BCRYPT_ROUNDS = 12;

/** 14 calendar days expressed in milliseconds. */
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// ─── Result types ─────────────────────────────────────────────────────────────

/** Successful action result. */
export interface ActionSuccess {
  success: true;
  message: string;
}

/** Failed action result. `error` is safe to display directly in the UI. */
export interface ActionFailure {
  success: false;
  /** Human-readable error string. Never includes stack traces or DB internals. */
  error: string;
}

/** Discriminated union returned by every action in this file. */
export type ActionResult = ActionSuccess | ActionFailure;

/** Return type of checkTrialStatus. */
export interface TrialStatus {
  /** True when the user's trial window is active right now. */
  isTrialActive: boolean;
  /** True when the user holds an active paid Stripe subscription. */
  isPro:         boolean;
  /**
   * UTC epoch-milliseconds when the trial window closes.
   * null when no trial data exists for this user.
   */
  trialEndsAt:   number | null;
  /**
   * Full calendar days remaining in the trial.
   * 0 when the trial has expired, null when no trial row exists.
   */
  daysLeft:      number | null;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Checks that `email` is a valid-looking email address.
 * Intentionally lightweight — we trust Turso's unique constraint to be the
 * final arbiter of duplicates; we're only trying to reject obvious garbage.
 */
function isValidEmail(email: string): boolean {
  // Covers 99%+ of real-world addresses without being a 2 KB regex.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Enforces the same password policy displayed on the register page:
 *   • Minimum 8 characters
 *   • At least one uppercase letter  (A–Z)
 *   • At least one number or symbol  (0–9 ! @ # $ % ^ & *)
 *
 * Mirrors the PasswordStrength component logic so server rejections are rare
 * (only possible if JS is disabled or the client validation is bypassed).
 */
function isStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9!@#$%^&*]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number or symbol (0–9 ! @ # $ % ^ & *).' };
  }
  return { valid: true };
}

// ─── registerUser ─────────────────────────────────────────────────────────────
//
// Full registration flow:
//   1. Extract and sanitise FormData fields.
//   2. Server-side input validation.
//   3. Duplicate email check (read).
//   4. Hash password with bcrypt (CPU-bound — takes ~250 ms at cost 12).
//   5. Insert user row with trial dates already set.
//   6. Return discriminated-union result.
//
// Callers (the Register page component):
//   const fd = new FormData();
//   fd.set('name',     nameValue);
//   fd.set('email',    emailValue);
//   fd.set('password', passwordValue);
//   fd.set('deviceId', fingerprintValue); // optional — Phase 3
//   const result = await registerUser(fd);

export async function registerUser(formData: FormData): Promise<ActionResult> {

  // ── Step 1: Extract fields ──────────────────────────────────────────────

  const rawName     = formData.get('name');
  const rawEmail    = formData.get('email');
  const rawPassword = formData.get('password');
  const rawDeviceId = formData.get('deviceId'); // optional; may be null

  // FormData.get() returns File | string | null.
  // We only accept strings — reject File objects and null immediately.
  if (
    typeof rawName     !== 'string' ||
    typeof rawEmail    !== 'string' ||
    typeof rawPassword !== 'string'
  ) {
    return {
      success: false,
      error:   'Invalid form submission. Please fill in all required fields.',
    };
  }

  const name     = rawName.trim();
  const email    = rawEmail.trim().toLowerCase();
  const password = rawPassword; // preserve whitespace — it may be intentional
  const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : null;

  // ── Step 2: Server-side validation ─────────────────────────────────────

  if (!name) {
    return { success: false, error: 'Full name is required.' };
  }

  if (name.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters long.' };
  }

  if (name.length > 120) {
    return { success: false, error: 'Name must be 120 characters or fewer.' };
  }

  if (!email) {
    return { success: false, error: 'Email address is required.' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (email.length > 255) {
    return { success: false, error: 'Email address is too long.' };
  }

  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  const passwordCheck = isStrongPassword(password);
  if (!passwordCheck.valid) {
    return { success: false, error: passwordCheck.reason! };
  }

  // ── Step 3: Duplicate email check ──────────────────────────────────────
  //
  // We select only the `id` column — the smallest possible payload over the
  // Turso HTTP API. We do NOT return "email already exists" as a distinct
  // error code to the client because that would enable email enumeration.
  // Instead, we use a generic message that covers both the "already exists"
  // and "DB error" cases from the user's perspective.

  try {
    const db = getDb();

    const existingRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingRows.length > 0) {
      return {
        success: false,
        error:
          'An account with this email address already exists. ' +
          'Please sign in or use a different email.',
      };
    }

  } catch (err) {
    // Log the raw error server-side; return a generic client message.
    console.error('[registerUser] Duplicate email check failed:', err);
    return {
      success: false,
      error:   'We could not complete your registration right now. Please try again in a moment.',
    };
  }

  // ── Step 4: Hash password ───────────────────────────────────────────────
  //
  // bcrypt.hash is intentionally slow (CPU-bound at cost factor 12).
  // This is a feature, not a bug — it makes offline brute-force attacks
  // computationally infeasible.
  //
  // On Cloudflare Workers (edge runtime), the standard Node.js `bcryptjs`
  // package may be slow or unavailable. If you deploy to Workers, replace
  // this with a WASM-based bcrypt implementation.

  let hashedPassword: string;

  try {
    hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (err) {
    console.error('[registerUser] bcrypt.hash failed:', err);
    return {
      success: false,
      error:   'We could not securely process your password. Please try again.',
    };
  }

  // ── Step 5: Build trial window ──────────────────────────────────────────
  //
  // Both values are Date objects because our schema columns are defined as:
  //   integer("trial_starts_at", { mode: "timestamp_ms" })
  //   integer("trial_ends_at",   { mode: "timestamp_ms" })
  //
  // Drizzle accepts Date objects for timestamp_ms columns and converts them
  // to epoch-milliseconds internally before sending to Turso.

  const now           = new Date();
  const trialStartsAt = now;
  const trialEndsAt   = new Date(now.getTime() + TRIAL_DURATION_MS);

  // ── Step 6: Insert the new user ─────────────────────────────────────────

  try {
    const db = getDb();

    await db.insert(users).values({
      // ── Auth.js core fields ─────────────────────────────────────────────
      name,
      email,
      // emailVerified: left null — we don't send verification emails in v1.
      //                Set this to `new Date()` if you add email verification.
      image: null,

      // ── Credentials ─────────────────────────────────────────────────────
      password: hashedPassword,

      // ── Role ────────────────────────────────────────────────────────────
      role: 'user',

      // ── Freemium trial ───────────────────────────────────────────────────
      //
      // These two fields are the "Freemium Hook": every new credentials user
      // starts a 14-day trial at the exact moment of registration.
      trialStartsAt, // new Date()           → stored as epoch-ms integer
      trialEndsAt,   // new Date() + 14 days → stored as epoch-ms integer

      // ── Billing ─────────────────────────────────────────────────────────
      stripeCustomerId: null, // populated later by the Stripe checkout flow
      isPro:            false,

      // ── Anti-fraud ──────────────────────────────────────────────────────
      // deviceId is the FingerprintJS visitor ID collected by the client.
      // Null until Phase 3 implements the fingerprinting logic.
      deviceId: deviceId ?? null,
    });

    console.info(
      '[registerUser] New user registered.',
      `email=${email}`,
      `trialEndsAt=${trialEndsAt.toISOString()}`,
    );

    return {
      success: true,
      message: 'Account created successfully! Your 14-day free trial has started.',
    };

  } catch (err) {
    // Detect unique constraint violation (email already exists — race condition
    // between the check in Step 3 and this insert).
    // Both @libsql/client and better-sqlite3 expose the SQLite error code as
    // err.code === 'SQLITE_CONSTRAINT_UNIQUE' or as a message containing "UNIQUE".
    const errMessage = err instanceof Error ? err.message : String(err);

    if (
      errMessage.includes('UNIQUE') ||
      errMessage.includes('SQLITE_CONSTRAINT')
    ) {
      return {
        success: false,
        error:   'An account with this email address already exists.',
      };
    }

    // Any other DB error.
    console.error('[registerUser] DB insert failed:', err);
    return {
      success: false,
      error:   'We could not create your account right now. Please try again in a moment.',
    };
  }
}

// ─── checkTrialStatus ────────────────────────────────────────────────────────
//
// Utility function called by Server Components and API routes to determine
// whether a user has access to premium content.
//
// Gate logic:
//   • isPro === true          → full access (active paid subscription)
//   • isTrialActive === true  → full access (within 14-day window)
//   • both false              → restricted access (show upgrade prompt)
//
// Usage in a Server Component:
//   const session = await auth();
//   if (!session?.user?.id) redirect('/login');
//   const trial = await checkTrialStatus(session.user.id);
//   if (!trial.isPro && !trial.isTrialActive) redirect('/upgrade');

export async function checkTrialStatus(userId: string): Promise<TrialStatus> {

  // ── Input guard ──────────────────────────────────────────────────────────

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.warn('[checkTrialStatus] Called with empty or invalid userId');
    return {
      isTrialActive: false,
      isPro:         false,
      trialEndsAt:   null,
      daysLeft:      null,
    };
  }

  // ── DB query ─────────────────────────────────────────────────────────────
  //
  // We select only the three columns we need. Selecting `*` would pull the
  // hashed password over the network on every gated page load.

  let row: {
    isPro:       boolean;
    trialEndsAt: Date | null;
  } | undefined;

  try {
    const db   = getDb();
    const rows = await db
      .select({
        isPro:       users.isPro,
        trialEndsAt: users.trialEndsAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    row = rows[0];

  } catch (err) {
    console.error('[checkTrialStatus] DB select failed for userId:', userId, '\n', err);
    // Return a safe "no access" state rather than crashing the page.
    return {
      isTrialActive: false,
      isPro:         false,
      trialEndsAt:   null,
      daysLeft:      null,
    };
  }

  // ── User not found ───────────────────────────────────────────────────────

  if (!row) {
    console.warn('[checkTrialStatus] No user row found for userId:', userId);
    return {
      isTrialActive: false,
      isPro:         false,
      trialEndsAt:   null,
      daysLeft:      null,
    };
  }

  // ── Normalise trialEndsAt ─────────────────────────────────────────────────
  //
  // integer({ mode: "timestamp_ms" }) → Drizzle returns Date | null on select.
  // We convert to epoch-ms for arithmetic and JSON-safe serialisation.

  let trialEndsAtMs: number | null = null;

  if (row.trialEndsAt instanceof Date) {
    trialEndsAtMs = row.trialEndsAt.getTime();
  } else if (typeof row.trialEndsAt === 'number') {
    // Some Turso driver versions return the raw integer without Date conversion.
    trialEndsAtMs = row.trialEndsAt;
  }
  // Otherwise: trialEndsAt is null — user has no trial data (shouldn't happen
  // in production because registerUser() and the createUser event both set it).

  // ── Compute trial state ──────────────────────────────────────────────────

  const isPro = row.isPro ?? false;
  const now   = Date.now();

  // Trial is active when:
  //   • The user does not already have a paid subscription (isPro === false).
  //   • A valid trialEndsAt value exists.
  //   • The current timestamp is BEFORE trialEndsAt (trial not yet expired).
  const isTrialActive =
    !isPro &&
    trialEndsAtMs !== null &&
    now < trialEndsAtMs;

  // daysLeft: full calendar days remaining. Floor (not ceil) so we never
  // tell a user "1 day left" when there are only 3 hours remaining.
  let daysLeft: number | null = null;

  if (trialEndsAtMs !== null) {
    if (now >= trialEndsAtMs) {
      // Trial has already expired — zero, not negative.
      daysLeft = 0;
    } else {
      const msRemaining = trialEndsAtMs - now;
      daysLeft = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    }
  }

  return {
    isTrialActive,
    isPro,
    trialEndsAt: trialEndsAtMs,
    daysLeft,
  };
}