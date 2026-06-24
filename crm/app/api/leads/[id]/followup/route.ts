import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { followUpDate } = await request.json();
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ lead });
}
