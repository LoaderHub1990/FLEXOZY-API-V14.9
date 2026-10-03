import { NextResponse } from 'next/server';
import { workerFetch } from '../../../../lib/worker';
export async function POST(req){try{return NextResponse.json(await workerFetch('/api/jobs',{method:'POST',body:JSON.stringify(await req.json())}));}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500});}}
