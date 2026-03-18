export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
  });
}
