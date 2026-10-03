import { NextResponse } from 'next/server';
import { workerFetch } from '../../../../lib/worker';

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body?.token || !Array.isArray(body?.questIds) || !body.questIds.length) {
      return NextResponse.json({ok:false,error:'ต้องระบุ Token และ Quest'}, {status:400});
    }
    return NextResponse.json(await workerFetch('/api/jobs', {
      method:'POST',
      body: JSON.stringify({token:String(body.token), questIds:body.questIds.map(String)})
    }));
  } catch(e) {
    return NextResponse.json({ok:false,error:e.message},{status:500});
  }
}
