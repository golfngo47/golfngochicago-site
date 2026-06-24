'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Lead, CallLog, Note, SmsLog,
  URGENCY_CONFIG, ACTIVITY_STATUSES, ACTIVITY_COLORS,
  fmtDate, fmtDateTime, isStale, getFollowUpStatus,
} from './types';

// ── Design tokens ─────────────────────────────────────────────────────────────
// White / light card backgrounds
const T = {
  primary:   '#111',
  secondary: '#111',
  muted:     '#222',
  border:    '#e2e8f0',
  bg:        '#f8fafc',
  label: { fontSize: 10, fontWeight: 700, color: '#222', textTransform: 'uppercase' as const, letterSpacing: '0.6px' },
};

const btn = (bg: string, color = 'white'): React.CSSProperties => ({
  background: bg, color, border: 'none', borderRadius: 6,
  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
});
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit',
  color: T.primary, background: 'white',
};

// ── Activity Status Pill ────────────────────────────────────────────────────
function ActivityPill({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const color = ACTIVITY_COLORS[lead.activityStatus] || '#222';

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function select(status: string) {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}/activity`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityStatus: status }),
    });
    setSaving(false);
    setOpen(false);
    onUpdate();
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        disabled={saving}
        style={{
          background: color, color: 'white', border: 'none', borderRadius: 20,
          padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap',
        }}>
        {saving ? '...' : lead.activityStatus} <span style={{ fontSize: 9 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 200,
          background: 'white', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: 185, padding: 6, border: `1px solid ${T.border}`,
        }}>
          {ACTIVITY_STATUSES.map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); select(s); }} style={{
              display: 'block', width: '100%', textAlign: 'left', border: 'none',
              background: s === lead.activityStatus ? '#f0f4ff' : 'white',
              padding: '7px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12,
              fontWeight: s === lead.activityStatus ? 700 : 400,
              color: ACTIVITY_COLORS[s] || T.secondary,
            }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline forms ────────────────────────────────────────────────────────────
function InlineCallForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [outcome, setOutcome] = useState('No Answer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); e.stopPropagation();
    setSaving(true);
    await fetch(`/api/leads/${leadId}/calls`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, notes }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={save} onClick={e => e.stopPropagation()} style={{
      background: 'white', border: `1px solid ${T.border}`, borderRadius: 8,
      padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', minWidth: 220,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: T.primary, marginBottom: 8 }}>📞 Log Call</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {['Answered', 'No Answer'].map(o => (
          <button key={o} type="button" onClick={() => setOutcome(o)} style={{
            flex: 1, padding: '5px 8px',
            border: `2px solid ${outcome === o ? '#1a3a2a' : T.border}`,
            borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: outcome === o ? '#1a3a2a' : 'white',
            color: outcome === o ? 'white' : T.secondary,
          }}>{o === 'Answered' ? '✅ Answered' : '📵 No Answer'}</button>
        ))}
      </div>
      <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
        style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" disabled={saving} style={{ ...btn('#1a3a2a'), flex: 1 }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onDone} style={{ ...btn('#f1f5f9', T.secondary) }}>Cancel</button>
      </div>
    </form>
  );
}

function InlineNoteForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!content.trim()) return;
    setSaving(true);
    await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={save} onClick={e => e.stopPropagation()} style={{
      background: 'white', border: `1px solid ${T.border}`, borderRadius: 8,
      padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', minWidth: 220,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: T.primary, marginBottom: 8 }}>📝 Add Note</div>
      <textarea autoFocus value={content} onChange={e => setContent(e.target.value)}
        rows={3} placeholder="Enter note..." style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" disabled={saving || !content.trim()} style={{ ...btn('#1a3a2a'), flex: 1 }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onDone} style={{ ...btn('#f1f5f9', T.secondary) }}>Cancel</button>
      </div>
    </form>
  );
}

// ── Quick Actions ──────────────────────────────────────────────────────────
function QuickActions({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const [active, setActive] = useState<'call' | 'note' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setActive(null); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function done() { setActive(null); onRefresh(); }

  const emailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(lead.clientEmail)}&su=${encodeURIComponent(`Golf 'n Go — ${lead.eventDate ? `Event ${lead.eventDate}` : 'Follow Up'}`)}&body=${encodeURIComponent(`Hi ${lead.clientName.split(' ')[0]},\n\nI wanted to follow up regarding your Golf 'n Go Chicago inquiry${lead.eventDate ? ` for ${lead.eventDate}` : ''}.\n\nBest,\nJake\nGolf 'n Go Chicago`)}`;

  const qBtn: React.CSSProperties = {
    background: '#f1f5f9', color: T.secondary, border: `1px solid ${T.border}`,
    borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div ref={ref} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setActive(active === 'call' ? null : 'call')}
        style={{ ...qBtn, background: active === 'call' ? '#1a3a2a' : '#f1f5f9', color: active === 'call' ? 'white' : T.secondary, border: `1px solid ${active === 'call' ? '#1a3a2a' : T.border}` }}>
        📞 Call
      </button>
      <button onClick={() => setActive(active === 'note' ? null : 'note')}
        style={{ ...qBtn, background: active === 'note' ? '#1a3a2a' : '#f1f5f9', color: active === 'note' ? 'white' : T.secondary, border: `1px solid ${active === 'note' ? '#1a3a2a' : T.border}` }}>
        📝 Note
      </button>
      <button onClick={async () => {
        await fetch(`/api/leads/${lead.id}/activity`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityStatus: 'Quote Sent' }),
        });
        onRefresh();
      }} style={qBtn}>💲 Quote</button>
      <a href={emailUrl} target="_blank" rel="noreferrer" onClick={async () => {
        await fetch(`/api/leads/${lead.id}/activity`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityStatus: 'Emailed' }),
        });
        onRefresh();
      }} style={{ ...qBtn, textDecoration: 'none', display: 'inline-block' }}>✉️ Email</a>

      {active === 'call' && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200 }}>
          <InlineCallForm leadId={lead.id} onDone={done} />
        </div>
      )}
      {active === 'note' && (
        <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200 }}>
          <InlineNoteForm leadId={lead.id} onDone={done} />
        </div>
      )}
    </div>
  );
}

// ── Emails tab content ─────────────────────────────────────────────────────
function EmailsTab({ lead }: { lead: Lead }) {
  const gmailSearchUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`from:${lead.clientEmail} OR to:${lead.clientEmail}`)}`;

  // Build a timeline from what we know — we don't store full email bodies,
  // but we have the counts, dates, and reply status from Gmail sync.
  const events: Array<{ date: string | null; dir: 'out' | 'in'; label: string; sub: string }> = [];

  if (lead.lastOutreachDate) {
    events.push({ date: lead.lastOutreachDate, dir: 'out', label: 'Last outreach email', sub: `${lead.outreachCount} total email${lead.outreachCount !== 1 ? 's' : ''} sent by Jake` });
  } else if (lead.outreachCount > 0) {
    events.push({ date: null, dir: 'out', label: `${lead.outreachCount} email${lead.outreachCount !== 1 ? 's' : ''} sent`, sub: 'Date not recorded' });
  }

  if (lead.clientReplied && lead.lastClientReplyDate) {
    events.push({ date: lead.lastClientReplyDate, dir: 'in', label: 'Last client reply', sub: 'Client responded via email' });
  }

  return (
    <div>
      {/* Status summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a3a2a' }}>{lead.outreachCount}</div>
          <div style={{ fontSize: 11, color: T.muted }}>Emails sent by Jake</div>
        </div>
        <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: lead.clientReplied ? '#1a7a3f' : '#c86000' }}>
            {lead.clientReplied ? 'Yes ✓' : 'No ✗'}
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Client replied</div>
        </div>
        <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.primary }}>{lead.lastOutreachDate ? fmtDate(lead.lastOutreachDate) : '—'}</div>
          <div style={{ fontSize: 11, color: T.muted }}>Last outreach</div>
        </div>
        <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.primary }}>{lead.lastClientReplyDate ? fmtDate(lead.lastClientReplyDate) : '—'}</div>
          <div style={{ fontSize: 11, color: T.muted }}>Last reply</div>
        </div>
      </div>

      {/* Thread timeline */}
      {events.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {events.map((ev, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 6, marginBottom: 6,
              background: ev.dir === 'out' ? '#fff7ed' : '#f0fdf4',
              borderLeft: `3px solid ${ev.dir === 'out' ? '#c86000' : '#1a7a3f'}`,
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 18 }}>{ev.dir === 'out' ? '📤' : '📥'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>{ev.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{ev.sub}</div>
              </div>
              {ev.date && (
                <div style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(ev.date)}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: T.muted, fontSize: 13, padding: '12px 0' }}>
          No email activity synced yet. Run Gmail sync to pull in email history.
        </div>
      )}

      {/* Gmail link */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
          Full email bodies are not stored locally. Open Gmail to read the full thread.
        </div>
        <a href={gmailSearchUrl} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#1a3a2a', color: 'white', textDecoration: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
        }}>
          📧 Open Gmail Thread
        </a>
      </div>
    </div>
  );
}

// ── Expanded detail ────────────────────────────────────────────────────────
function ExpandedDetail({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const [tab, setTab] = useState<'details' | 'calls' | 'notes' | 'sms' | 'emails' | 'cadence'>('details');
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [showCallForm, setShowCallForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [followUp, setFollowUp] = useState(lead.followUpDate ? lead.followUpDate.split('T')[0] : '');
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smsDir, setSmsDir] = useState('Sent');
  const [smsNotes, setSmsNotes] = useState('');

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/calls`).then(r => r.json()).then(d => setCalls(d.calls || []));
    fetch(`/api/leads/${lead.id}/notes`).then(r => r.json()).then(d => setNotes(d.notes || []));
    fetch(`/api/leads/${lead.id}/sms`).then(r => r.json()).then(d => setSmsLogs(d.smsLogs || []));
  }, [lead.id]);

  function afterCallSaved() {
    setShowCallForm(false); onRefresh();
    fetch(`/api/leads/${lead.id}/calls`).then(r => r.json()).then(d => setCalls(d.calls || []));
  }
  function afterNoteSaved() {
    setShowNoteForm(false); onRefresh();
    fetch(`/api/leads/${lead.id}/notes`).then(r => r.json()).then(d => setNotes(d.notes || []));
  }

  async function saveSms(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/leads/${lead.id}/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: smsDir, notes: smsNotes }),
    });
    setSmsNotes(''); setShowSmsForm(false);
    fetch(`/api/leads/${lead.id}/sms`).then(r => r.json()).then(d => setSmsLogs(d.smsLogs || []));
  }

  async function saveFollowUp() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}/followup`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpDate: followUp || null }),
    });
    setSaving(false);
    onRefresh();
  }

  async function handleUrgencyOverride(urgency: string) {
    await fetch(`/api/leads/${lead.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urgency }),
    });
    setShowOverride(false);
    onRefresh();
  }

  function getCadence() {
    const jDate = new Date(lead.jotformReceivedAt).getTime();
    const hasCall = (d1: number, d2: number) => calls.some(c => {
      const diff = (new Date(c.date).getTime() - jDate) / 86400000;
      return diff >= d1 && diff <= d2;
    });
    const hasEmail = (d1: number, d2: number) => {
      if (!lead.lastOutreachDate) return false;
      const diff = (new Date(lead.lastOutreachDate).getTime() - jDate) / 86400000;
      return diff >= d1 && diff <= d2;
    };
    const hasSms = (d1: number, d2: number) => smsLogs.some(s => {
      const diff = (new Date(s.date).getTime() - jDate) / 86400000;
      return diff >= d1 && diff <= d2;
    });
    return [
      { label: 'Day 1: Called', done: calls.length > 0, icon: '📞' },
      { label: 'Day 1: Emailed', done: lead.outreachCount > 0, icon: '✉️' },
      { label: 'Day 3: Follow-up', done: hasCall(2, 4) || hasEmail(2, 4) || hasSms(2, 4), icon: '🔁' },
      { label: 'Day 7: Final check-in', done: hasCall(6, 9) || hasEmail(6, 9) || hasSms(6, 9), icon: '🏁' },
    ];
  }

  const TABS_CFG = [
    { id: 'details',  label: 'Details' },
    { id: 'calls',    label: `Calls${calls.length ? ` (${calls.length})` : ''}` },
    { id: 'notes',    label: `Notes${notes.length ? ` (${notes.length})` : ''}` },
    { id: 'sms',      label: `SMS${smsLogs.length ? ` (${smsLogs.length})` : ''}` },
    { id: 'emails',   label: `Emails${lead.outreachCount ? ` (${lead.outreachCount})` : ''}` },
    { id: 'cadence',  label: 'Cadence' },
  ];

  return (
    <div style={{ padding: '14px 16px 16px', borderTop: `1px solid ${T.border}`, background: '#fafcff', borderRadius: '0 0 8px 8px' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
        {TABS_CFG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            background: 'none', border: 'none', padding: '6px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? '#1a3a2a' : T.muted,
            borderBottom: tab === t.id ? '2px solid #1a3a2a' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Details ── */}
      {tab === 'details' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'Email', value: lead.clientEmail, link: `mailto:${lead.clientEmail}` },
              { label: 'Phone', value: lead.clientPhone, link: `tel:${lead.clientPhone}` },
              { label: 'Event Type', value: lead.eventType || '—' },
              { label: 'Package', value: lead.packageName },
              { label: 'Start Time', value: lead.startTime },
              { label: 'Quote Amount', value: lead.quoteAmount ? `$${lead.quoteAmount.toLocaleString()}` : lead.quoteSent ? 'Sent' : 'Not sent' },
              { label: 'Quote #', value: lead.quoteNumber ? `#${lead.quoteNumber}` : '—' },
              { label: 'Deposit', value: lead.depositPaid ? `$${lead.depositAmount?.toLocaleString() || '?'} ✅` : 'Not paid' },
              { label: 'Found via', value: lead.source || '—' },
            ].map(c => (
              <div key={c.label}>
                <div style={T.label}>{c.label}</div>
                {c.link ? (
                  <a href={c.link} style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none', wordBreak: 'break-word' }}>{c.value || '—'}</a>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.primary, wordBreak: 'break-word' }}>{c.value || '—'}</div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline strip */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12, padding: '8px 12px', background: T.bg, borderRadius: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ color: T.secondary }}>📩 Inquired: <strong style={{ color: T.primary }}>{fmtDate(lead.jotformReceivedAt)}</strong></span>
            <span style={{ color: T.secondary }}>📤 Last outreach: <strong style={{ color: T.primary }}>{lead.lastOutreachDate ? fmtDate(lead.lastOutreachDate) : 'None'}</strong></span>
            <span style={{ color: T.secondary }}>💬 Reply: <strong style={{ color: lead.clientReplied ? '#1a7a3f' : '#c86000' }}>{lead.clientReplied && lead.lastClientReplyDate ? fmtDate(lead.lastClientReplyDate) : 'No reply'}</strong></span>
            <span style={{ color: T.secondary }}>📨 Sent: <strong style={{ color: T.primary }}>{lead.outreachCount}</strong></span>
          </div>

          {/* AI summary */}
          {lead.summary && (
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 4 }}>📋 Where Things Stand</div>
              <div style={{ fontSize: 13, color: T.primary, lineHeight: 1.6 }}>{lead.summary}</div>
            </div>
          )}

          {/* Follow-up */}
          <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ ...T.label, marginBottom: 6 }}>🔔 Follow-Up Reminder</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 140 }} />
              <button onClick={saveFollowUp} disabled={saving} style={{ ...btn('#1a3a2a') }}>
                {saving ? 'Saving...' : 'Set Reminder'}
              </button>
              {lead.followUpDate && (
                <button onClick={async () => {
                  setFollowUp('');
                  await fetch(`/api/leads/${lead.id}/followup`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ followUpDate: null }),
                  });
                  onRefresh();
                }} style={{ ...btn('#f1f5f9', T.muted), fontSize: 11 }}>Clear</button>
              )}
            </div>
          </div>

          {/* Status override */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <div style={{ ...T.label, marginBottom: 6 }}>Manual Status Override</div>
            {!showOverride ? (
              <button onClick={() => setShowOverride(true)} style={{ ...btn('#f1f5f9', T.secondary) }}>✏️ Change Pipeline Status</button>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['CONFIRMED', 'COMPLETED', 'HOT', 'WARM', 'COLD', 'LOST'].map(s => {
                  const c = URGENCY_CONFIG[s];
                  return (
                    <button key={s} onClick={() => handleUrgencyOverride(s)} style={{ ...btn(c.bg), fontSize: 11 }}>{c.label}</button>
                  );
                })}
                <button onClick={() => setShowOverride(false)} style={{ ...btn('#f1f5f9', T.muted), fontSize: 11 }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Calls ── */}
      {tab === 'calls' && (
        <div>
          <button onClick={() => setShowCallForm(!showCallForm)} style={{ ...btn('#1a3a2a'), marginBottom: 12 }}>📞 Log a Call</button>
          {showCallForm && <div style={{ marginBottom: 12 }}><InlineCallForm leadId={lead.id} onDone={afterCallSaved} /></div>}
          {calls.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 13, padding: '12px 0' }}>No calls logged yet.</div>
          ) : calls.map(c => (
            <div key={c.id} style={{
              padding: '10px 12px', borderRadius: 6, marginBottom: 8,
              background: c.outcome === 'Answered' ? '#f0fff4' : '#fff8f0',
              borderLeft: `3px solid ${c.outcome === 'Answered' ? '#1a7a3f' : '#c86000'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: T.primary }}>
                  {c.outcome === 'Answered' ? '✅ Answered' : '📵 No Answer'}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>{fmtDateTime(c.date)}</span>
              </div>
              {c.notes && <div style={{ fontSize: 12, color: T.secondary, marginTop: 4 }}>{c.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Notes ── */}
      {tab === 'notes' && (
        <div>
          <button onClick={() => setShowNoteForm(!showNoteForm)} style={{ ...btn('#1a3a2a'), marginBottom: 12 }}>📝 Add Note</button>
          {showNoteForm && <div style={{ marginBottom: 12 }}><InlineNoteForm leadId={lead.id} onDone={afterNoteSaved} /></div>}
          {notes.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 13, padding: '12px 0' }}>No notes yet.</div>
          ) : notes.map(n => (
            <div key={n.id} style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 8, background: '#fffde7', borderLeft: '3px solid #f0c040' }}>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>{fmtDateTime(n.createdAt)}</div>
              <div style={{ fontSize: 13, color: T.primary, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── SMS ── */}
      {tab === 'sms' && (
        <div>
          <button onClick={() => setShowSmsForm(!showSmsForm)} style={{ ...btn('#1a3a2a'), marginBottom: 12 }}>💬 Log Text</button>
          {showSmsForm && (
            <form onSubmit={saveSms} style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.primary, marginBottom: 8 }}>💬 Log SMS</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {['Sent', 'Received'].map(d => (
                  <button key={d} type="button" onClick={() => setSmsDir(d)} style={{
                    flex: 1, padding: '5px 8px',
                    border: `2px solid ${smsDir === d ? '#1a3a2a' : T.border}`,
                    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: smsDir === d ? '#1a3a2a' : 'white',
                    color: smsDir === d ? 'white' : T.secondary,
                  }}>{d === 'Sent' ? '📤 Sent' : '📥 Received'}</button>
                ))}
              </div>
              <input placeholder="Notes (optional)" value={smsNotes} onChange={e => setSmsNotes(e.target.value)}
                style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" style={{ ...btn('#1a3a2a'), flex: 1 }}>Save</button>
                <button type="button" onClick={() => setShowSmsForm(false)} style={{ ...btn('#f1f5f9', T.secondary) }}>Cancel</button>
              </div>
            </form>
          )}
          {smsLogs.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 13, padding: '12px 0' }}>No texts logged yet.</div>
          ) : smsLogs.map(s => (
            <div key={s.id} style={{
              padding: '9px 12px', borderRadius: 6, marginBottom: 6,
              background: s.direction === 'Received' ? '#eff6ff' : '#fdf4ff',
              borderLeft: `3px solid ${s.direction === 'Received' ? '#2a5f9e' : '#7b5ea7'}`,
            }}>
              <div style={{ fontSize: 10, color: T.muted }}>
                {s.direction === 'Received' ? '📥 Received' : '📤 Sent'} · {fmtDateTime(s.date)}
              </div>
              {s.notes && <div style={{ fontSize: 12, color: T.primary, marginTop: 2 }}>{s.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Emails ── */}
      {tab === 'emails' && <EmailsTab lead={lead} />}

      {/* ── Cadence ── */}
      {tab === 'cadence' && (
        <div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>Closing sequence for {lead.clientName}</div>
          {(() => {
            const items = getCadence();
            const done = items.filter(i => i.done).length;
            const pct = Math.round((done / items.length) * 100);
            return (
              <>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, marginBottom: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#1a7a3f' : '#1a3a2a', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 14 }}>{done}/{items.length} steps · {pct}%</div>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 6, marginBottom: 6,
                    background: item.done ? '#f0fff4' : T.bg,
                    border: `1px solid ${item.done ? '#bbf7d0' : T.border}`,
                  }}>
                    <span style={{ fontSize: 16 }}>{item.done ? '✅' : '☐'}</span>
                    <span style={{ fontSize: 13, fontWeight: item.done ? 600 : 400, color: item.done ? '#1a7a3f' : T.secondary }}>
                      {item.icon} {item.label}
                    </span>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Main Lead Card ──────────────────────────────────────────────────────────
export default function LeadCard({ lead, onRefresh, forceOpen }: {
  lead: Lead; onRefresh: () => void; forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cfg = URGENCY_CONFIG[lead.urgency] || URGENCY_CONFIG.WARM;
  const price = lead.quoteAmount || lead.packagePrice;
  const stale = isStale(lead);
  const followUp = getFollowUpStatus(lead);
  const callCount = lead._count?.calls || 0;
  const noteCount = lead._count?.notes || 0;

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);

  return (
    <div style={{
      background: 'white', border: `1px solid ${T.border}`,
      borderLeft: `5px solid ${cfg.border}`, borderRadius: 8,
      marginBottom: 10, overflow: 'visible',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative',
    }}>
      {/* ── Collapsed header ── */}
      <div style={{ padding: '12px 16px' }}>
        <div
          onClick={() => setOpen(!open)}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,200px) 1fr 1fr 1fr auto', gap: 10, cursor: 'pointer', alignItems: 'start' }}
        >
          {/* Name + city */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, fontFamily: 'Georgia, serif' }}>{lead.clientName}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
              {lead.eventCity || '—'}
              {lead.eventType && (
                <span style={{ marginLeft: 6, background: '#eff6ff', color: '#2563eb', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>
                  {lead.eventType}
                </span>
              )}
            </div>
          </div>

          {/* Event date */}
          <div>
            {lead.eventDate ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>📅 {lead.eventDate}</div>
                {lead.daysUntil !== null && (
                  <div style={{ fontSize: 11, color: lead.daysUntil <= 14 ? '#dc2626' : T.muted, marginTop: 1 }}>
                    {lead.daysUntil > 0 ? `${lead.daysUntil}d away` : lead.daysUntil === 0 ? '🔴 TODAY' : `${Math.abs(lead.daysUntil)}d ago`}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>No date</div>
            )}
          </div>

          {/* Quote */}
          <div>
            <span style={{
              background: lead.quoteSent ? '#dcfce7' : '#fff7ed',
              color: lead.quoteSent ? '#15803d' : '#c2410c',
              padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {lead.quoteSent ? `$${price?.toLocaleString() || '?'}` : '⚠️ No Quote'}
            </span>
            {lead.depositPaid && (
              <div style={{ fontSize: 11, color: '#15803d', marginTop: 2, fontWeight: 600 }}>✅ Deposit paid</div>
            )}
          </div>

          {/* Last contact */}
          <div>
            <div style={{ fontSize: 11, color: T.muted }}>Last:</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.primary }}>
              {lead.lastOutreachDate ? fmtDate(lead.lastOutreachDate) : 'Never'}
            </div>
            <div style={{ fontSize: 10, color: T.muted }}>
              {lead.outreachCount}✉
              {callCount > 0 ? ` · ${callCount}📞` : ''}
              {noteCount > 0 ? ` · ${noteCount}📝` : ''}
            </div>
          </div>

          {/* Urgency + expand */}
          <div style={{ textAlign: 'right', minWidth: 100 }}>
            <span style={{ display: 'block', background: cfg.bg, color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 10, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap' }}>
              {cfg.label}
            </span>
            <div style={{ fontSize: 14, color: T.muted, textAlign: 'center' }}>{open ? '▲' : '▼'}</div>
          </div>
        </div>

        {/* ── Bottom row: activity pill + quick actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
          <ActivityPill lead={lead} onUpdate={onRefresh} />
          {stale && (
            <span style={{ background: '#ffebee', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>
              ⚠️ Gone Stale
            </span>
          )}
          {followUp && (
            <span style={{
              background: followUp.overdue ? '#ffebee' : '#fffbeb',
              color: followUp.color,
              border: `1px solid ${followUp.color}40`,
              borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700,
            }}>
              {followUp.label}
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <QuickActions lead={lead} onRefresh={onRefresh} />
          </div>
        </div>
      </div>

      {open && <ExpandedDetail lead={lead} onRefresh={onRefresh} />}
    </div>
  );
}
