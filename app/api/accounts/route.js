import { NextResponse } from 'next/server';
import { workerFetch } from '../../../lib/worker';
export async function GET(){try{return NextResponse.json(await workerFetch('/api/accounts'));}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500});}}
