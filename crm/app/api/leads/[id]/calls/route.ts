import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const calls = await prisma.callLog.findMany({
    where: { leadId: id },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json({ calls });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { outcome, notes, date } = await request.json();
  const call = await prisma.callLog.create({
    data: {
      leadId: id,
      outcome: outcome || 'No Answer',
      notes: notes || '',
      date: date ? new Date(date) : new Date(),
    },
  });
  // Update activityStatus based on outcome
  const newActivity = outcome === 'Answered' ? 'Called - Answered' : 'Called - No Answer';
  await prisma.lead.update({
    where: { id },
    data: { activityStatus: newActivity, updatedAt: new Date() },
  });
  return NextResponse.json({ call }, { status: 201 });
}
