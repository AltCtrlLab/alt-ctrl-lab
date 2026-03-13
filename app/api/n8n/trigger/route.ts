import { NextRequest, NextResponse } from 'next/server';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, payload } = body;
    if (!workflowId) return NextResponse.json({ success: false, error: 'workflowId requis' }, { status: 400 });

    if (!N8N_API_KEY) {
      return NextResponse.json({ success: false, error: 'N8N_API_KEY non configuré' }, { status: 503 });
    }

    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ success: false, error: `n8n error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
