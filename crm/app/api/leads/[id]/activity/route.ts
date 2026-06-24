import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const VALID = [
  'New Lead', 'Emailed', 'Called - No Answer', 'Called - Answered',
  'Quote Sent', 'Follow Up', 'Negotiating', 'Deposit Paid', 'Closed Lost',
];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activityStatus } = await request.json();
  if (!VALID.includes(activityStatus)) {
    return NextResponse.json({ error: 'Invalid activity status' }, { status: 400 });
  }
  const lead = await prisma.lead.update({
    where: { id },
    data: { activityStatus, updatedAt: new Date() },
  });
  return NextResponse.json({ lead });
}
