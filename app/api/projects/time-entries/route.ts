import { NextRequest, NextResponse } from 'next/server';
import {
  createTimeEntry,
  getTimeEntriesForProject,
  deleteTimeEntry,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ success: false, error: 'projectId requis' }, { status: 400 });
    const entries = await getTimeEntriesForProject(projectId);
    return NextResponse.json({ success: true, data: { entries } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createTimeEntry({
      projectId: body.projectId,
      description: body.description,
      hours: Number(body.hours),
      date: body.date ?? Date.now(),
      category: body.category,
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    await deleteTimeEntry(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
