// lib/sync.ts
import { prisma } from './db';
import { fetchEmailsSince } from './gmail';
import {
  parseJotformEmail, parseJobberEmail, shouldSkipEmail,
  estimatePackagePrice, JotformLead, JobberEvent
} from './parser';

const SALES_EMAIL = 'sales@golfngochicago.com';

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  let [m, d, y] = parts.map(Number);
  if (y < 100) y += 2000;
  const eventDate = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return dateStr;
  let [m, d, y] = parts.map(Number);
  if (y < 100) y += 2000;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m-1]} ${d}, ${y}`;
}

function calcUrgency(params: {
  status: string;
  daysUntil: number | null;
  quoteSent: boolean;
  quoteDate: Date | null;
  outreachCount: number;
  jotformDate: Date;
}): string {
  const { status, daysUntil: du, quoteSent, quoteDate, outreachCount, jotformDate } = params;
  const now = new Date();

  if (status === 'completed') return 'COMPLETED';
  if (status === 'confirmed') return 'CONFIRMED';
  if (status === 'lost') return 'LOST';
  if (du !== null && du < 0) return 'PASSED';
  if (du !== null && du <= 7) return 'CRITICAL';
  if (du !== null && du <= 14) return 'URGENT';

  if (!quoteSent) {
    const daysSince = daysBetween(jotformDate, now);
    return daysSince > 2 ? 'URGENT' : 'HOT';
  }

  if (quoteDate) {
    const daysSince = daysBetween(quoteDate, now);
    if (daysSince <= 5) return 'HOT';
    if (daysSince <= 14) return 'WARM';
    return 'COLD';
  }

  return 'WARM';
}

function calcStatus(hasDeposit: boolean, hasInvoicePaid: boolean): string {
  if (hasInvoicePaid) return 'completed';
  if (hasDeposit) return 'confirmed';
  return 'active';
}

interface LeadData {
  jotform: JotformLead;
  quotes: JobberEvent[];
  deposits: JobberEvent[];
  payments: JobberEvent[];
  outreachCount: number;
  clientReplied: boolean;
  lastClientReplyDate: Date | null;
  lastOutreachDate: Date | null;
}

export async function runSync(): Promise<{ leads_created: number; leads_updated: number; errors: number }> {
  console.log('[Sync] ════ Starting sync ════');
  let created = 0, updated = 0, errors = 0;

  // ─── STEP 1: Fetch all emails ─────────────────────────────────────────
  const allEmails = await fetchEmailsSince(null);
  console.log(`[Sync] Fetched ${allEmails.length} emails`);

  // ─── STEP 2: Build lead map from JotForm emails ───────────────────────
  // Key: clean client email address
  const leadMap = new Map<string, LeadData>();

  for (const email of allEmails) {
    if (shouldSkipEmail(email.from, email.subject)) continue;
    const jotform = parseJotformEmail(email.from, email.subject, email.body, new Date(email.date));
    if (!jotform) continue;

    const key = jotform.email.toLowerCase();
    if (!leadMap.has(key)) {
      leadMap.set(key, {
        jotform,
        quotes: [], deposits: [], payments: [],
        outreachCount: 0, clientReplied: false,
        lastClientReplyDate: null, lastOutreachDate: null,
      });
    } else {
      // Keep the most recent JotForm submission for this email
      const existing = leadMap.get(key)!;
      if (jotform.receivedAt > existing.jotform.receivedAt) {
        existing.jotform = jotform;
      }
    }
  }

  // ─── STEP 3: Build name lookup index ─────────────────────────────────
  // Maps normalized full name and first name → client email
  const nameToEmail = new Map<string, string>();
  for (const [email, data] of leadMap) {
    const full = normalizeName(data.jotform.name);
    nameToEmail.set(full, email);
    const first = full.split(' ')[0];
    if (first.length > 2) nameToEmail.set(first, email);
  }

  function matchByName(name?: string): string | undefined {
    if (!name) return undefined;
    const norm = normalizeName(name);
    if (nameToEmail.has(norm)) return nameToEmail.get(norm);
    // First-name fallback
    const first = norm.split(' ')[0];
    if (nameToEmail.has(first)) return nameToEmail.get(first);
    // Substring fallback
    for (const [n, em] of nameToEmail) {
      if (norm.includes(n) || n.includes(norm)) return em;
    }
    return undefined;
  }

  // ─── STEP 4: Match Jobber emails → leads ─────────────────────────────
  for (const email of allEmails) {
    if (shouldSkipEmail(email.from, email.subject)) continue;
    const jobber = parseJobberEmail(email.from, email.subject, email.body, new Date(email.date));
    if (!jobber) continue;

    const matchedEmail = matchByName(jobber.clientName);
    if (!matchedEmail) continue;
    const lead = leadMap.get(matchedEmail);
    if (!lead) continue;

    switch (jobber.type) {
      case 'jobber_quote':   lead.quotes.push(jobber);   break;
      case 'jobber_deposit': lead.deposits.push(jobber); break;
      case 'jobber_invoice_paid': lead.payments.push(jobber); break;
    }
  }

  // ─── STEP 5: Match outreach + client reply emails ─────────────────────
  // Build a set of all known client email addresses for fast lookup
  const clientEmails = new Set(leadMap.keys());

  for (const email of allEmails) {
    const fromAddr = (email.from.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)?.[1] || '').toLowerCase();
    const toAddr   = (email.to?.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)?.[1] || '').toLowerCase();
    const isSalesFrom = fromAddr === SALES_EMAIL.toLowerCase();
    const isSalesTo   = toAddr === SALES_EMAIL.toLowerCase();

    // Outbound: sales@ → client
    if (isSalesFrom && toAddr && clientEmails.has(toAddr)) {
      const lead = leadMap.get(toAddr)!;
      lead.outreachCount++;
      const d = new Date(email.date);
      if (!lead.lastOutreachDate || d > lead.lastOutreachDate) lead.lastOutreachDate = d;
    }

    // Inbound: client → sales@
    if (isSalesTo && fromAddr && clientEmails.has(fromAddr) && fromAddr !== SALES_EMAIL.toLowerCase()) {
      const lead = leadMap.get(fromAddr)!;
      lead.clientReplied = true;
      const d = new Date(email.date);
      if (!lead.lastClientReplyDate || d > lead.lastClientReplyDate) lead.lastClientReplyDate = d;
    }
  }

  // ─── STEP 6: Delete stale duplicate records (old corrupt-email versions) ──
  // Any DB record whose email ends with "phone" or contains no @ is garbage
  await prisma.lead.deleteMany({
    where: {
      OR: [
        { clientEmail: { endsWith: 'phone' } },
        { clientEmail: { not: { contains: '@' } } },
      ],
    },
  });
  console.log('[Sync] Cleaned up corrupt-email duplicate records');

  // ─── STEP 7: Upsert leads ─────────────────────────────────────────────
  console.log(`[Sync] Upserting ${leadMap.size} leads...`);

  for (const [clientEmail, data] of leadMap) {
    try {
      const { jotform, quotes, deposits, payments, outreachCount, clientReplied, lastClientReplyDate, lastOutreachDate } = data;

      const hasDeposit    = deposits.length > 0;
      const hasInvoicePaid = payments.length > 0;
      const quoteSent     = quotes.length > 0;

      // Use the latest quote
      const latestQuote  = quotes.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0];
      const quoteAmount  = latestQuote?.amount;
      const quoteNumber  = latestQuote?.quoteNumber;
      const depositAmount = deposits[0]?.amount;

      const status = calcStatus(hasDeposit, hasInvoicePaid);
      const du     = daysUntil(jotform.eventDate);
      const estimatedPrice = quoteAmount || estimatePackagePrice(jotform.packageName);

      const urgency = calcUrgency({
        status,
        daysUntil: du,
        quoteSent,
        quoteDate: latestQuote?.receivedAt || null,
        outreachCount,
        jotformDate: jotform.receivedAt,
      });

      // AI summary
      const summaryContext = `
Lead: ${jotform.name} (${clientEmail})
Event: ${formatEventDate(jotform.eventDate)} ${jotform.startTime ? 'at ' + jotform.startTime : ''} in ${jotform.eventCity}
Package: ${jotform.packageName}
Inquired via JotForm: ${jotform.receivedAt.toLocaleDateString()}
Quote sent via Jobber: ${quoteSent ? `Yes — $${quoteAmount || 'amount unknown'} ${quoteNumber ? '(Quote #' + quoteNumber + ')' : ''}` : 'NOT YET SENT'}
Deposit paid: ${hasDeposit ? `Yes — $${depositAmount}` : 'No'}
Status: ${status.toUpperCase()}
Outreach emails sent by Jake: ${outreachCount}
Client replied: ${clientReplied ? 'Yes, last on ' + lastClientReplyDate?.toLocaleDateString() : 'No'}
Days until event: ${du !== null ? du + ' days' : 'unknown (no date given)'}
      `.trim();

      let summary = '';
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system: `You are a sales assistant for Golf 'n Go Chicago, a mobile golf simulator rental. Write a 2-3 sentence "Where Things Stand" summary. Be direct and action-oriented. Tell Jake exactly what to do next. Never use bullet points.`,
            messages: [{ role: 'user', content: summaryContext }],
          }),
        });
        const d = await resp.json();
        summary = d.content?.[0]?.text || '';
      } catch {
        summary = `${quoteSent ? `Quote of $${quoteAmount} sent.` : 'No quote sent yet.'} ${hasDeposit ? 'Deposit paid — CONFIRMED.' : ''}`.trim();
      }

      const leadRecord = {
        clientEmail,
        clientName:         jotform.name,
        clientPhone:        jotform.phone,
        eventDate:          formatEventDate(jotform.eventDate),
        eventDateRaw:       jotform.eventDate,
        startTime:          jotform.startTime,
        eventCity:          jotform.eventCity,
        packageName:        jotform.packageName,
        packagePrice:       estimatedPrice,
        source:             jotform.source,
        status,
        urgency,
        daysUntil:          du,
        quoteSent,
        quoteAmount:        quoteAmount || null,
        quoteNumber:        quoteNumber || null,
        depositPaid:        hasDeposit,
        depositAmount:      depositAmount || null,
        invoicePaid:        hasInvoicePaid,
        outreachCount,
        clientReplied,
        lastOutreachDate,
        lastClientReplyDate,
        jotformReceivedAt:  jotform.receivedAt,
        summary,
        updatedAt:          new Date(),
      };

      const existing = await prisma.lead.findFirst({ where: { clientEmail } });
      if (existing) {
        // Preserve any manual urgency override (LOST, etc.) unless we have real signals
        const preserveOverride =
          ['LOST'].includes(existing.urgency) &&
          !['confirmed', 'completed'].includes(status);
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            ...leadRecord,
            urgency: preserveOverride ? existing.urgency : urgency,
            status:  preserveOverride ? existing.status  : status,
          },
        });
        updated++;
      } else {
        await prisma.lead.create({ data: { ...leadRecord, createdAt: new Date() } });
        created++;
      }
    } catch (e) {
      console.error(`[Sync] Error processing ${clientEmail}:`, e);
      errors++;
    }
  }

  // ─── STEP 8: Update sync state ────────────────────────────────────────
  await prisma.syncState.upsert({
    where:  { id: 'singleton' },
    create: { id: 'singleton', lastSyncAt: new Date() },
    update: { lastSyncAt: new Date() },
  });

  console.log(`[Sync] Done. Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
  return { leads_created: created, leads_updated: updated, errors };
}
