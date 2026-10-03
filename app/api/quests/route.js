import { NextResponse } from 'next/server';
import { workerFetch } from '../../../lib/worker';
export async function GET(req){try{const id=new URL(req.url).searchParams.get('accountId')||'';return NextResponse.json(await workerFetch(`/api/quests?accountId=${encodeURIComponent(id)}`));}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500});}}
