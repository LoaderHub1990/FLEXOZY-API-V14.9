import { NextResponse } from 'next/server';
import { workerFetch } from '../../../lib/worker';

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body?.token) return NextResponse.json({ok:false,error:'กรุณาใส่ Token'}, {status:400});
    return NextResponse.json(await workerFetch('/api/quests', {
      method:'POST',
      body: JSON.stringify({token:String(body.token)})
    }));
  } catch(e) {
    return NextResponse.json({ok:false,error:e.message},{status:500});
  }
}
