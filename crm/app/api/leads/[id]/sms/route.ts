import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const smsLogs = await prisma.smsLog.findMany({
    where: { leadId: id },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json({ smsLogs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { direction, notes, date } = await request.json();
  const sms = await prisma.smsLog.create({
    data: {
      leadId: id,
      direction: direction || 'Sent',
      notes: notes || '',
      date: date ? new Date(date) : new Date(),
    },
  });
  await prisma.lead.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ sms }, { status: 201 });
}
