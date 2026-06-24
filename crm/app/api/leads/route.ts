import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const URGENCY_ORDER: Record<string, number> = {
  CRITICAL: 1, URGENT: 2, HOT: 3, WARM: 4, COLD: 5,
  CONFIRMED: 6, COMPLETED: 7, PASSED: 8, LOST: 9,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';

  const leads = await prisma.lead.findMany({
    include: {
      _count: { select: { calls: true, notes: true, smsLogs: true } },
    },
  });

  let filtered = leads;
  if (filter !== 'all') {
    filtered = leads.filter(l => l.urgency === filter.toUpperCase());
  }

  const sorted = filtered.sort((a, b) => {
    const ao = URGENCY_ORDER[a.urgency] || 99;
    const bo = URGENCY_ORDER[b.urgency] || 99;
    if (ao !== bo) return ao - bo;
    // Overdue follow-ups bubble up
    const now = Date.now();
    const aOver = a.followUpDate && new Date(a.followUpDate).getTime() < now ? -1 : 0;
    const bOver = b.followUpDate && new Date(b.followUpDate).getTime() < now ? -1 : 0;
    if (aOver !== bOver) return aOver - bOver;
    return (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999);
  });

  return NextResponse.json({ leads: sorted, total: sorted.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    clientName, clientEmail, clientPhone, eventDate, startTime,
    eventCity, packageName, packagePrice, source, activityStatus,
    urgency, eventType, notes: noteContent,
  } = body;

  if (!clientName) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  if (!clientPhone && !clientEmail) return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });

  // Duplicate check
  const existing = await prisma.lead.findFirst({
    where: {
      OR: [
        clientEmail ? { clientEmail: clientEmail.toLowerCase().trim() } : {},
        clientPhone ? { clientPhone: clientPhone.trim() } : {},
      ].filter(c => Object.keys(c).length > 0),
    },
  });
  if (existing) {
    return NextResponse.json({
      duplicate: true,
      existing: { id: existing.id, name: existing.clientName, email: existing.clientEmail },
    }, { status: 409 });
  }

  const lead = await prisma.lead.create({
    data: {
      clientName: clientName.trim(),
      clientEmail: clientEmail?.toLowerCase().trim() || `manual-${Date.now()}@gng.local`,
      clientPhone: clientPhone?.trim() || '',
      eventDate: eventDate || '',
      startTime: startTime || '',
      eventCity: eventCity || '',
      packageName: packageName || '',
      packagePrice: packagePrice || 0,
      source: source || '',
      activityStatus: activityStatus || 'New Lead',
      urgency: urgency || 'URGENT',
      eventType: eventType || '',
      jotformReceivedAt: new Date(),
    },
  });

  if (noteContent) {
    await prisma.note.create({ data: { leadId: lead.id, content: noteContent } });
  }

  return NextResponse.json({ lead }, { status: 201 });
}
