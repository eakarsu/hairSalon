import {claim} from '@/components/native-ai/nativeQuota';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { requestAppointmentReadiness } from '@/lib/openrouter';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({})) as { appointmentSummary?: unknown };
    const appointmentSummary = typeof body.appointmentSummary === 'string' ? body.appointmentSummary.trim() : '';
    if (appointmentSummary.length < 10 || appointmentSummary.length > 1000) {
      return NextResponse.json({ error: 'appointmentSummary must contain 10-1000 characters' }, { status: 400 });
    }
    claim(session.user.salonId+':'+session.user.id);
    const evidence = await requestAppointmentReadiness(appointmentSummary,request.signal);
    if(request.signal.aborted)return NextResponse.json({error:"Request cancelled"},{status:499});
    const result = await prisma.$transaction(async(tx)=>{if(request.signal.aborted)throw new Error('cancelled');const saved=await tx.aiResult.create({
      data: {
        feature: 'APPOINTMENT_READINESS',
        salonId: session.user.salonId,
        userId: session.user.id,
        model: evidence.providerReceipt.model,
        input: { appointmentSummary },
        output: { result: evidence.result, providerReceipt: evidence.providerReceipt },
      },
      select: { id: true, createdAt: true },
    });
    if(request.signal.aborted)throw new Error('cancelled');return saved;});
    return NextResponse.json({
      analysisId: result.id,
      createdAt: result.createdAt,
      ...evidence,
    });
  } catch (error) {
    if(request.signal.aborted)return NextResponse.json({error:'Request cancelled'},{status:499});
    if(error instanceof Error && 'status' in error)return NextResponse.json({error:error.message},{status:Number(error.status)});
    console.error('Appointment readiness error:', error instanceof Error?error.name:'unknown');
    return NextResponse.json({ error: 'AI provider request failed' }, { status: 502 });
  }
}

export async function GET(){const session=await getServerSession(authOptions);if(!session?.user)return NextResponse.json({error:'Unauthorized'},{status:401});const rows=await prisma.aiResult.findMany({where:{userId:session.user.id,salonId:session.user.salonId,feature:'APPOINTMENT_READINESS'},orderBy:{createdAt:'desc'},take:50});return NextResponse.json({reports:rows.map(row=>{const input=row.input as {appointmentSummary?:string};const output=row.output as {result?:string};return {id:row.id,prompt:input.appointmentSummary||'',content:output.result||'',model:row.model,createdAt:row.createdAt};})});}
