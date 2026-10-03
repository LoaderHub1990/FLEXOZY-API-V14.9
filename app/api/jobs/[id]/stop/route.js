import { NextResponse } from 'next/server';
import { workerFetch } from '../../../../../lib/worker';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(
      await workerFetch(`/api/jobs/${encodeURIComponent(id)}/stop`, { method: 'POST' })
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
