export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limiter';

const SESSION_COOKIE = 'altctrl_session';

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts / 15 min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`login:${ip}`, 'login');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 },
    );
  }

  let username: string;
  let password: string;
  try {
    const body = await req.json();
    username = String(body.username ?? '');
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const validUser = process.env.COCKPIT_USER ?? '';
  const validPass = process.env.COCKPIT_PASSWORD ?? '';

  if (!validUser || !validPass) {
    return NextResponse.json({ error: 'Authentification non configurée' }, { status: 503 });
  }

  // Timing-safe comparison (pad to equal length to prevent length leaks)
  const PAD = 128;
  const userMatch = timingSafeEqual(
    Buffer.from(username.slice(0, PAD).padEnd(PAD)),
    Buffer.from(validUser.slice(0, PAD).padEnd(PAD)),
  );
  const passMatch = timingSafeEqual(
    Buffer.from(password.slice(0, PAD).padEnd(PAD)),
    Buffer.from(validPass.slice(0, PAD).padEnd(PAD)),
  );

  // Also verify exact length to prevent padded brute-force
  const lengthMatch = username.length === validUser.length && password.length === validPass.length;

  if (!userMatch || !passMatch || !lengthMatch) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }

  // Generate HMAC-signed session token
  const secret = process.env.AUTH_SECRET || validPass;
  const exp = Date.now() + 24 * 60 * 60 * 1000; // 24h
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString('base64url');
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  const token = `${payload}.${hmac}`;

  const isProd = process.env.NODE_ENV === 'production';
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });
  return res;
}
