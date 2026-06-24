export interface Lead {
  id: string;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  eventDate: string;
  eventDateRaw: string;
  startTime: string;
  eventCity: string;
  packageName: string;
  packagePrice: number;
  source: string;
  status: string;
  urgency: string;
  daysUntil: number | null;
  quoteSent: boolean;
  quoteAmount: number | null;
  quoteNumber: number | null;
  depositPaid: boolean;
  depositAmount: number | null;
  invoicePaid: boolean;
  outreachCount: number;
  clientReplied: boolean;
  lastOutreachDate: string | null;
  lastClientReplyDate: string | null;
  jotformReceivedAt: string;
  summary: string;
  activityStatus: string;
  followUpDate: string | null;
  eventType: string;
  _count?: { calls: number; notes: number; smsLogs: number };
}

export interface CallLog {
  id: string;
  leadId: string;
  date: string;
  outcome: string;
  notes: string;
  createdAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
}

export interface SmsLog {
  id: string;
  leadId: string;
  date: string;
  direction: string;
  notes: string;
  createdAt: string;
}

export interface DashboardData {
  totalLeads: number;
  confirmedRevenue: number;
  pipelineRevenue: number;
  overdueFollowUps: number;
  needAction: number;
  noQuoteUrgent: Lead[];
  neverCalled: Lead[];
  thisWeekEvents: Lead[];
  sourceBreakdown: Record<string, number>;
  monthlyRevenue: Array<{ month: string; label: string; confirmed: number; pipeline: number; count: number }>;
  closeRate: number;
  confirmedCount: number;
  totalContacted: number;
}

export const URGENCY_CONFIG: Record<string, { bg: string; text: string; label: string; border: string }> = {
  CRITICAL:  { bg: '#cc0000', text: 'white', label: '🚨 CRITICAL',  border: '#cc0000' },
  URGENT:    { bg: '#e05500', text: 'white', label: '⚡ URGENT',    border: '#e05500' },
  HOT:       { bg: '#c86000', text: 'white', label: '🔥 HOT',       border: '#c86000' },
  WARM:      { bg: '#a07000', text: 'white', label: '♨️ WARM',       border: '#a07000' },
  COLD:      { bg: '#2a5f9e', text: 'white', label: '❄️ COLD',       border: '#2a5f9e' },
  CONFIRMED: { bg: '#1a7a3f', text: 'white', label: '✅ CONFIRMED',  border: '#1a7a3f' },
  COMPLETED: { bg: '#3d6622', text: 'white', label: '🏆 COMPLETED',  border: '#3d6622' },
  PASSED:    { bg: '#777',    text: 'white', label: '📅 PASSED',     border: '#777' },
  LOST:      { bg: '#555',    text: 'white', label: '❌ LOST',       border: '#555' },
};

export const ACTIVITY_STATUSES = [
  'New Lead', 'Emailed', 'Called - No Answer', 'Called - Answered',
  'Quote Sent', 'Follow Up', 'Negotiating', 'Deposit Paid', 'Closed Lost',
];

export const ACTIVITY_COLORS: Record<string, string> = {
  'New Lead': '#2a5f9e',
  'Emailed': '#7b5ea7',
  'Called - No Answer': '#a07000',
  'Called - Answered': '#c86000',
  'Quote Sent': '#1a7a3f',
  'Follow Up': '#e05500',
  'Negotiating': '#cc0000',
  'Deposit Paid': '#1a7a3f',
  'Closed Lost': '#555',
};

export const PACKAGES = [
  { label: 'Tee Off — 3hr', price: 900 },
  { label: 'Front Nine — 4hr', price: 1050 },
  { label: '18 Hole — 5hr', price: 1200 },
  { label: 'Custom', price: 0 },
];

export const EVENT_TYPES = [
  'Birthday', 'Graduation', 'Corporate', 'Wedding',
  'Baby Shower', 'Backyard Party', 'Bachelor/Bachelorette', 'Other',
];

export const URGENCY_TABS = [
  { id: 'ALL',       label: '📋 All',       color: '#333' },
  { id: 'CRITICAL',  label: '🚨 Critical',  color: '#cc0000' },
  { id: 'URGENT',    label: '⚡ Urgent',    color: '#e05500' },
  { id: 'HOT',       label: '🔥 Hot',       color: '#c86000' },
  { id: 'WARM',      label: '♨️ Warm',       color: '#a07000' },
  { id: 'COLD',      label: '❄️ Cold',       color: '#2a5f9e' },
  { id: 'CONFIRMED', label: '✅ Confirmed',  color: '#1a7a3f' },
  { id: 'COMPLETED', label: '🏆 Completed',  color: '#3d6622' },
  { id: 'PASSED',    label: '📅 Passed',     color: '#777' },
  { id: 'LOST',      label: '❌ Lost',       color: '#555' },
];

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return String(d); }
}

export function fmtDateFull(d: string | Date | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return String(d); }
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return String(d); }
}

export function isStale(lead: Lead): boolean {
  if (['CONFIRMED', 'COMPLETED', 'LOST', 'PASSED'].includes(lead.urgency)) return false;
  if (!lead.daysUntil || lead.daysUntil > 30) return false;
  const lastContact = [
    lead.lastOutreachDate,
    lead.lastClientReplyDate,
  ].filter(Boolean).map(d => new Date(d!).getTime());
  const mostRecent = lastContact.length ? Math.max(...lastContact) : null;
  if (!mostRecent) return true; // never contacted + event in 30 days
  const daysSince = (Date.now() - mostRecent) / 86400000;
  return daysSince >= 5;
}

export function getFollowUpStatus(lead: Lead): { label: string; color: string; overdue: boolean } | null {
  if (!lead.followUpDate) return null;
  const d = new Date(lead.followUpDate);
  const daysUntil = Math.round((d.getTime() - Date.now()) / 86400000);
  if (daysUntil < 0) return { label: `⚠️ Overdue ${Math.abs(daysUntil)}d`, color: '#cc0000', overdue: true };
  if (daysUntil === 0) return { label: '🔔 Follow up TODAY', color: '#e05500', overdue: false };
  if (daysUntil === 1) return { label: '🔔 Follow up tomorrow', color: '#c86000', overdue: false };
  return { label: `🔔 Follow up in ${daysUntil}d`, color: '#a07000', overdue: false };
}
