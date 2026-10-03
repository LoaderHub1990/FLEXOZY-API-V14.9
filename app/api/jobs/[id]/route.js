import { NextResponse } from 'next/server';
import { workerFetch } from '../../../../lib/worker';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(await workerFetch(`/api/jobs/${encodeURIComponent(id)}`));
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
