import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Parse a lead's event date into a JS Date.
 * Tries eventDateRaw (MM/DD/YYYY or MM-DD-YYYY) first, then eventDate
 * (which may be "Jun 6, 2026" display format), then falls back to null.
 */
function parseLeadDate(eventDateRaw: string, eventDate: string): Date | null {
  // Try raw format first: MM/DD/YYYY or MM-DD-YYYY
  const raw = eventDateRaw || eventDate;
  if (raw) {
    const slashDash = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashDash) {
      let [, m, d, y] = slashDash.map(Number);
      if (y < 100) y += 2000;
      return new Date(y, m - 1, d);
    }
  }

  // Try display format: "Jun 6, 2026" or "Jun 6 2026"
  const display = eventDate || eventDateRaw;
  if (display) {
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    };
    const m = display.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const month = monthMap[m[1].toLowerCase()];
      if (month !== undefined) return new Date(parseInt(m[3]), month, parseInt(m[2]));
    }
  }

  return null;
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: { _count: { select: { calls: true, notes: true } } },
  });

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000);

  // Revenue
  const confirmed = leads.filter(l => ['CONFIRMED', 'COMPLETED'].includes(l.urgency));
  const confirmedRevenue = confirmed.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
  const pipeline = leads.filter(l => ['CRITICAL', 'URGENT', 'HOT', 'WARM', 'COLD'].includes(l.urgency));
  const pipelineRevenue = pipeline.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);

  // Action items
  const overdueFollowUps = leads.filter(l => l.followUpDate && new Date(l.followUpDate) < now).length;
  const noQuoteUrgent = leads.filter(l =>
    !l.quoteSent && ['CRITICAL', 'URGENT'].includes(l.urgency) &&
    l.daysUntil !== null && l.daysUntil <= 7
  );
  const neverCalled = leads.filter(l =>
    ['CRITICAL', 'URGENT'].includes(l.urgency) && l._count.calls === 0
  );

  // This week events
  const thisWeekEvents = leads.filter(l => {
    const d = parseLeadDate(l.eventDateRaw, l.eventDate);
    return d && d >= now && d <= in7Days;
  });

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {};
  for (const lead of leads) {
    const src = lead.source || 'Unknown';
    let normalized = src;
    if (/instagram|facebook|social|ig\b/i.test(src)) normalized = 'Instagram/Facebook';
    else if (/google/i.test(src)) normalized = 'Google';
    else if (/referral|friend|word|referred/i.test(src)) normalized = 'Referral';
    else if (/tiktok/i.test(src)) normalized = 'TikTok';
    else if (/jotform/i.test(src)) normalized = 'JotForm';
    else if (!src || src === 'Unknown' || src.trim() === '') normalized = 'Unknown';
    sourceBreakdown[normalized] = (sourceBreakdown[normalized] || 0) + 1;
  }

  // Monthly revenue — last 2 months + current + next 4
  const months: Array<{ month: string; label: string; confirmed: number; pipeline: number; count: number }> = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const monthLeads = leads.filter(l => {
      const ld = parseLeadDate(l.eventDateRaw, l.eventDate);
      return ld && ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
    });

    // "actual" = booked, completed, or already passed (events that happened)
    const conf = monthLeads
      .filter(l => ['CONFIRMED', 'COMPLETED', 'PASSED'].includes(l.urgency))
      .reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
    // "pipeline" = active leads with event dates in this month
    const pipe = monthLeads
      .filter(l => ['CRITICAL', 'URGENT', 'HOT', 'WARM', 'COLD'].includes(l.urgency))
      .reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);

    months.push({ month: key, label, confirmed: conf, pipeline: pipe, count: monthLeads.length });
  }

  // Close rate
  const contacted = leads.filter(l => l.outreachCount > 0 || l._count.calls > 0);
  const won = leads.filter(l => ['CONFIRMED', 'COMPLETED'].includes(l.urgency));
  const closeRate = contacted.length > 0 ? Math.round((won.length / contacted.length) * 100) : 0;

  return NextResponse.json({
    totalLeads: leads.length,
    confirmedRevenue,
    pipelineRevenue,
    overdueFollowUps,
    needAction: noQuoteUrgent.length + neverCalled.length,
    noQuoteUrgent: noQuoteUrgent.slice(0, 5),
    neverCalled: neverCalled.slice(0, 5),
    thisWeekEvents,
    sourceBreakdown,
    monthlyRevenue: months,
    closeRate,
    confirmedCount: confirmed.length,
    totalContacted: contacted.length,
  });
}
