export async function login(password: string): Promise<{ error?: string }> {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Debug logging
    console.error('[auth-debug] adminPassword exists:', !!adminPassword);
    console.error('[auth-debug] adminPassword length:', adminPassword?.length ?? 0);
    console.error('[auth-debug] input password length:', password.length);
    console.error('[auth-debug] passwords match:', password === adminPassword);

    if (!adminPassword) {
      return { error: 'ADMIN_PASSWORD is not set in environment.' };
    }

    if (password !== adminPassword) {
      return { error: `Incorrect password. (Input: "${password.slice(0,3)}...", Expected length: ${adminPassword.length})` };
    }

    const token       = await deriveSessionToken(adminPassword);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly : true,
      secure   : true,
      sameSite : 'lax',
      path     : '/',
      maxAge   : 60 * 60 * 24 * 7,
    });

    return {};
  } catch (err) {
    console.error('[auth] login error:', err);
    return { error: `Unexpected error: ${String(err)}` };
  }
}