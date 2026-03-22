import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|login|api/auth|api/webhooks).*)',
  ],
};

const SESSION_COOKIE = 'altctrl_session';

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex < 0) return false;
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    if (!payload || !sig) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Decode hex signature
    const sigBytes = new Uint8Array(sig.match(/.{2}/g)!.map(b => parseInt(b, 16)));

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;

    // Check expiry
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' && Date.now() < decoded.exp;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  // Allow service-to-service calls (cron, VPS proxy)
  const dashKey = req.headers.get('x-dashboard-key');
  const cronSecret = process.env.CRON_SECRET || 'altctrl-cron-secret';
  if (dashKey === cronSecret) return NextResponse.next();

  // If no credentials configured, allow through (dev mode without env vars)
  const user = process.env.COCKPIT_USER;
  const password = process.env.COCKPIT_PASSWORD;
  if (!user || !password) return NextResponse.next();

  const secret = process.env.AUTH_SECRET || password;

  // Check session cookie
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken && await verifyToken(sessionToken, secret)) {
    return NextResponse.next();
  }

  // Redirect to login page
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
