import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api/webhooks).*)'],
};

export default function middleware(req: NextRequest) {
  const user = process.env.COCKPIT_USER;
  const password = process.env.COCKPIT_PASSWORD;

  // If no credentials configured, allow through (dev mode)
  if (!user || !password) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [reqUser, reqPassword] = decoded.split(':');
      if (reqUser === user && reqPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Alt Ctrl Lab Cockpit"',
    },
  });
}
