// lib/parser.ts

export interface JotformLead {
  type: 'jotform';
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  startTime: string;
  packageName: string;
  eventCity: string;
  source: string;
  receivedAt: Date;
}

export interface JobberEvent {
  type: 'jobber_quote' | 'jobber_approved' | 'jobber_deposit' | 'jobber_invoice_paid';
  clientName?: string;
  quoteNumber?: number;
  invoiceNumber?: number;
  amount?: number;
  receivedAt: Date;
}

export type ParsedEmailResult = JotformLead | JobberEvent | null;

// ─── BLOCKLIST ────────────────────────────────────────────────────────────
const BLOCKED_SENDERS = [
  'messaging.squareup.com', 'microsoftadvertising.com', 'pipedrive.com',
  'rbauction.com', 'workspace-noreply@google.com', 'businessprofile-noreply@google.com',
  'sc-noreply@google.com', 'notify-noreply@google.com',
  'mail.instagram.com', 'facebook.com', 'tiktok.com', 'zapier.com',
  'jotformsign.com', 'product-research@getjobber.com', 'academy@getjobber.com',
  'marketing@getjobber.com', 'support@getjobber.com', 'support-no-reply@getjobber.com',
  'accountmanager.inbox@getjobber.com', 'sdr.team@getjobber.com',
  'chinel.b@getjobber.com', 'isabelle.d@getjobber.com', 'nada.b@getjobber.com',
  'noreply@getjobber.com',
];

const BLOCKED_SUBJECT_PATTERNS = [
  /jotform\s+(standard|enterprise|chatgpt|claude|webinar|pdfs are ready|live launch)/i,
  /announcing (jotform|integrations)/i,
  /register for (our|the) upcoming/i,
  /don'?t miss out.*jotform/i,
  /marketing suite/i,
  /3 free months of jobber/i,
  /welcome to jobber/i,
  /your recurring clients/i,
  /key to seamless payments/i,
  /you'?ve been busy/i,
  /supercharge your growth/i,
  /changes to your payout/i,
  /set yourself up for success/i,
  /jobber support request/i,
  /jobber payments - bank account/i,
  /two-step verification.*jobber/i,
  /congratulations on your first payment/i,
  /tell us what you think about jobber/i,
  /here are two more powerful tools/i,
  /here come the robots/i,
  /get all apps on deck/i,
  /still thinking about trying/i,
  /would you hire someone/i,
  /free connect trial/i,
  /introducing marketing tools/i,
  /marketing suite trial/i,
  /exclusively for you.*jobber/i,
  /bonus for our favourite/i,
  /want 3 free months of jobber/i,
  /updated.*terms of service.*jobber/i,
];

export function shouldSkipEmail(from: string, subject: string): boolean {
  const f = from.toLowerCase();
  for (const b of BLOCKED_SENDERS) { if (f.includes(b)) return true; }
  for (const p of BLOCKED_SUBJECT_PATTERNS) { if (p.test(subject)) return true; }
  return false;
}

// ─── JOTFORM FIELD SPLITTER ───────────────────────────────────────────────
// JotForm plaintext smashes label+value with no delimiter:
//   "Emailfoo@bar.comPhone Number(312)555-1234Date06-20-2026..."
// We split on known label boundaries (longest first to avoid partial matches).
const JOTFORM_LABELS = [
  'Where did you hear about us?',
  'Select Your Package',
  'Event City / Town',
  'Phone Number',
  'Start Time',
  'Event City',
  'Email',
  'Date',
  'Name',
  'City',
];

function splitJotformBody(body: string): Record<string, string> {
  const flat = body.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const escaped = JOTFORM_LABELS.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escaped.join('|');
  const splitter = new RegExp(`(${pattern})`, 'i');
  const parts = flat.split(splitter);

  const fields: Record<string, string> = {};
  for (let i = 1; i < parts.length - 1; i += 2) {
    const label = parts[i].trim();
    const value = (parts[i + 1] || '')
      .trim()
      .replace(/\s*You can edit this submission.*$/i, '')
      .trim();
    if (label && value) fields[label.toLowerCase()] = value;
  }
  return fields;
}

function getField(fields: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = fields[k.toLowerCase()];
    if (v) return v;
  }
  return '';
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  raw = raw.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
  const dash = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) return `${dash[1]}/${dash[2]}/${dash[3]}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const monthMap: Record<string, string> = {
    january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12',
    jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',
    sep:'09',oct:'10',nov:'11',dec:'12',
  };
  const text = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (text) {
    const m = monthMap[text[1].toLowerCase()];
    if (m) return `${m}/${text[2].padStart(2,'0')}/${text[3]}`;
  }
  return raw;
}

// ─── JOTFORM PARSER ───────────────────────────────────────────────────────
export function parseJotformEmail(
  from: string,
  subject: string,
  body: string,
  receivedAt: Date
): JotformLead | null {
  if (!subject.includes('GOLFNGO Form')) return null;
  if (!from.toLowerCase().includes('jotform.com')) return null;
  if (BLOCKED_SUBJECT_PATTERNS.some(p => p.test(subject))) return null;

  const name = subject.match(/GOLFNGO Form\s*[-–—]\s*(.+)/i)?.[1]?.trim() || '';
  const fields = splitJotformBody(body);

  const rawEmail = getField(fields, 'email', 'e-mail');
  const email = (rawEmail.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)?.[1] || '').toLowerCase();

  if (!name || !email) return null;

  return {
    type: 'jotform',
    name,
    email,
    phone:       getField(fields, 'phone number', 'phone', 'cell', 'mobile'),
    eventDate:   normalizeDate(getField(fields, 'date', 'event date')),
    startTime:   getField(fields, 'start time', 'time'),
    packageName: getField(fields, 'select your package', 'package'),
    eventCity:   getField(fields, 'event city / town', 'event city', 'city', 'location'),
    source:      getField(fields, 'where did you hear about us?', 'where did you hear about us'),
    receivedAt,
  };
}

// ─── JOBBER PARSER ────────────────────────────────────────────────────────
// Real Jobber [COPY] subjects look like:
//   "[COPY] Quote from Golf 'n Go  - May 26, 2026"       (no quote number in subject)
//   "[COPY] Receipt for payment from Golf 'n Go  - ..."   (deposit/payment)
//   "[COPY] Invoice from Golf 'n Go  - ..."               (invoice)
// Client name and amounts live in the body only.

export function parseJobberEmail(
  from: string,
  subject: string,
  body: string,
  receivedAt: Date
): JobberEvent | null {
  const f = from.toLowerCase();
  const isJobber =
    f.includes('notification@msg.getjobber.com') ||
    f.includes('noreply@txn.getjobber.com');
  if (!isJobber) return null;
  if (shouldSkipEmail(from, subject)) return null;

  const isCopy = subject.includes('[COPY]');
  if (!isCopy) return null; // only process [COPY] emails — those go to sales@

  // ── Client name — always in body as "Hi FirstName LastName," ──
  const clientMatch = body.match(/Hi\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),/);
  const clientName  = clientMatch?.[1]?.trim();

  // ── Quote sent ──
  if (/\[COPY\].*quote/i.test(subject)) {
    // Amount: "quote total is $1200.00" or "The quote total is $X"
    const amountMatch =
      body.match(/quote total is \$([0-9,]+(?:\.\d{2})?)/i) ||
      body.match(/\$([0-9,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
    // Quote number may be in body: "Quote #19" or "quote number 19"
    const qNumMatch = body.match(/Quote\s*#\s*(\d+)/i) || body.match(/quote number\s*(\d+)/i);
    return {
      type: 'jobber_quote',
      clientName,
      quoteNumber: qNumMatch ? parseInt(qNumMatch[1]) : undefined,
      amount,
      receivedAt,
    };
  }

  // ── Receipt = deposit payment ──
  if (/\[COPY\].*receipt/i.test(subject)) {
    const amountMatch =
      body.match(/payment of \$([0-9,]+(?:\.\d{2})?)/i) ||
      body.match(/\$([0-9,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
    return {
      type: 'jobber_deposit',
      clientName,
      amount,
      receivedAt,
    };
  }

  // ── Invoice ──
  if (/\[COPY\].*invoice/i.test(subject)) {
    const amountMatch =
      body.match(/invoice total is \$([0-9,]+(?:\.\d{2})?)/i) ||
      body.match(/BALANCE\s*\$([0-9,]+(?:\.\d{2})?)/i) ||
      body.match(/\$([0-9,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
    const invMatch = body.match(/Invoice\s*#\s*(\d+)/i);
    return {
      type: 'jobber_invoice_paid',
      clientName,
      invoiceNumber: invMatch ? parseInt(invMatch[1]) : undefined,
      amount,
      receivedAt,
    };
  }

  return null;
}

// ─── PACKAGE PRICE ESTIMATE ───────────────────────────────────────────────
export function estimatePackagePrice(packageName: string): number {
  const p = packageName.toLowerCase();
  if (p.includes('full 18') || p.includes('7 hour') || p.includes('7hr')) return 1500;
  if (p.includes('front nine') || p.includes('5 hour') || p.includes('4 hour') ||
      p.includes('5hr') || p.includes('4hr') || p.includes('most popular')) return 1000;
  if (p.includes('tee off') || p.includes('3 hour') || p.includes('3hr') ||
      p.includes('minimum')) return 750;
  return 750;
}
