import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      _count: { select: { calls: true, notes: true, smsLogs: true } },
    },
    orderBy: { jotformReceivedAt: 'desc' },
  });

  const headers = [
    'Name', 'Email', 'Phone', 'Event Date', 'Start Time', 'City',
    'Package', 'Package Price', 'Quote Sent', 'Quote Amount', 'Quote #',
    'Deposit Paid', 'Deposit Amount', 'Invoice Paid', 'Status', 'Activity Status',
    'Event Type', 'Source', 'Outreach Count', 'Client Replied',
    'Last Outreach', 'Last Reply', 'Follow Up Date', 'Calls Logged',
    'Notes Count', 'SMS Count', 'Inquired At',
  ];

  function esc(v: string | null | undefined): string {
    if (!v) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  function fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-US'); } catch { return ''; }
  }

  const rows = leads.map(l => [
    esc(l.clientName), esc(l.clientEmail), esc(l.clientPhone),
    esc(l.eventDate), esc(l.startTime), esc(l.eventCity),
    esc(l.packageName), l.packagePrice || '',
    l.quoteSent ? 'Yes' : 'No', l.quoteAmount || '', l.quoteNumber || '',
    l.depositPaid ? 'Yes' : 'No', l.depositAmount || '',
    l.invoicePaid ? 'Yes' : 'No',
    esc(l.urgency), esc(l.activityStatus), esc(l.eventType), esc(l.source),
    l.outreachCount, l.clientReplied ? 'Yes' : 'No',
    fmtDate(l.lastOutreachDate), fmtDate(l.lastClientReplyDate),
    fmtDate(l.followUpDate),
    l._count.calls, l._count.notes, l._count.smsLogs,
    fmtDate(l.jotformReceivedAt),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const now = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="gng-leads-${now}.csv"`,
    },
  });
}
