import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const VALID_URGENCIES = ['CRITICAL','URGENT','HOT','WARM','COLD','CONFIRMED','COMPLETED','PASSED','LOST'];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { urgency } = await request.json();

    if (!VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json({ error: 'Invalid urgency value' }, { status: 400 });
    }

    // Map urgency to status
    const statusMap: Record<string, string> = {
      CONFIRMED: 'confirmed',
      COMPLETED: 'completed',
      LOST: 'lost',
      PASSED: 'passed',
    };
    const newStatus = statusMap[urgency] || 'active';

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        urgency,
        status: newStatus,
        // If marking confirmed, also set depositPaid flag
        ...(urgency === 'CONFIRMED' ? { depositPaid: true } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (e: any) {
    console.error('[API/leads/status] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
