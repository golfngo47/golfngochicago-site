'use client';
import { useEffect, useState } from 'react';
import { Lead, DashboardData, URGENCY_CONFIG, fmtDate } from './types';

// ── Shared card style (white background) ────────────────────────────────────
const card: React.CSSProperties = {
  background: 'white', borderRadius: 10, padding: '16px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
};
// Text on white cards
const T = {
  primary:   '#111',   // headings, names
  secondary: '#111',   // supporting info
  muted:     '#222',   // labels, timestamps, counts
  label:     { fontSize: 10, color: '#222', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 4 },
};

function MiniLeadRow({ lead, onSelect }: { lead: Lead; onSelect: (id: string) => void }) {
  const cfg = URGENCY_CONFIG[lead.urgency] || URGENCY_CONFIG.WARM;
  return (
    <div onClick={() => onSelect(lead.id)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 6, cursor: 'pointer', borderLeft: `4px solid ${cfg.border}`,
      background: '#f8fafc', marginBottom: 6, transition: 'background 0.15s',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: T.primary }}>{lead.clientName}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
          {lead.eventDate || 'No date'} · {lead.eventCity || '—'}
        </div>
      </div>
      <span style={{ background: cfg.bg, color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────
function MiniCalendar({ leads }: { leads: Lead[] }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [tooltip, setTooltip] = useState<{ day: number; leads: Lead[] } | null>(null);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const dayLeads: Record<number, Lead[]> = {};
  for (const lead of leads) {
    if (!lead.eventDate) continue;
    const parts = lead.eventDate.split(/[\/\-]/);
    if (parts.length !== 3) continue;
    let [m, d, y] = parts.map(Number);
    if (y < 100) y += 2000;
    if (m - 1 === viewMonth && y === viewYear) {
      if (!dayLeads[d]) dayLeads[d] = [];
      dayLeads[d].push(lead);
    }
  }

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function prev() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function next() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const onDay = dayLeads[d] || [];
    const isToday = d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
    const hasConf = onDay.some(l => ['CONFIRMED', 'COMPLETED', 'PASSED'].includes(l.urgency));
    const hasPend = onDay.some(l => !['CONFIRMED', 'COMPLETED', 'LOST', 'PASSED'].includes(l.urgency));
    const dot = hasConf ? '#1a7a3f' : hasPend ? '#c86000' : 'transparent';

    cells.push(
      <div key={d} onClick={() => onDay.length ? setTooltip(tooltip?.day === d ? null : { day: d, leads: onDay }) : null} style={{
        aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', borderRadius: 6,
        cursor: onDay.length ? 'pointer' : 'default',
        background: isToday ? '#1a3a2a' : tooltip?.day === d ? '#e8f0eb' : 'transparent',
        fontWeight: isToday ? 700 : 400,
        color: isToday ? 'white' : onDay.length ? T.primary : '#cbd5e1',
        fontSize: 13, position: 'relative',
        border: onDay.length && tooltip?.day !== d ? '1px solid #e2e8f0' : '1px solid transparent',
      }}>
        {d}
        {onDay.length > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, marginTop: 1 }} />}
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.primary }}>📅 Calendar</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={prev} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 13, color: T.secondary }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>{monthName}</span>
          <button onClick={next} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 13, color: T.secondary }}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: 700, padding: '2px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>{cells}</div>
      {tooltip && (
        <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          <div style={T.label}>Events on {monthName.split(' ')[0]} {tooltip.day}</div>
          {tooltip.leads.map(l => {
            const cfg = URGENCY_CONFIG[l.urgency];
            return (
              <div key={l.id} style={{ fontSize: 12, padding: '4px 8px', background: '#f8fafc', borderRadius: 4, marginBottom: 3, borderLeft: `3px solid ${cfg.border}` }}>
                <span style={{ fontWeight: 600, color: T.primary }}>{l.clientName}</span>
                <span style={{ color: T.muted, marginLeft: 6 }}>{l.packageName || l.eventCity || '—'}</span>
                <span style={{ marginLeft: 6, background: cfg.bg, color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10 }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: T.muted }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1a7a3f', marginRight: 4 }} />Booked</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#c86000', marginRight: 4 }} />Pending</span>
      </div>
    </div>
  );
}

// ─── Source Chart ──────────────────────────────────────────────────────────
function SourceChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);
  const colors = ['#1a3a2a', '#2a6a4a', '#c86000', '#2a5f9e', '#7b5ea7', '#a07000', '#555'];
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 14 }}>📊 Lead Sources</div>
      {entries.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13 }}>No data yet — sync Gmail to populate.</div>
      ) : entries.map(([src, count], i) => (
        <div key={src} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 500, color: T.secondary }}>{src}</span>
            <span style={{ color: T.muted, fontWeight: 700 }}>{count}</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${(count / max) * 100}%`,
              background: colors[i % colors.length],
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Revenue Chart ─────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: DashboardData['monthlyRevenue'] }) {
  const CHART_H = 80;
  const MIN_BAR_H = 4; // always show at least 4px if there's any value
  const max = Math.max(...data.map(m => (m.confirmed ?? 0) + (m.pipeline ?? 0)), 1);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div style={card}>
      <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 14 }}>💰 Revenue by Month</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 4, minHeight: CHART_H + 40 }}>
        {data.map(m => {
          // clamp to min bar height so small values are still visible
          const conf = m.confirmed ?? 0;
          const pipe = m.pipeline ?? 0;
          const confH = conf > 0 ? Math.max(MIN_BAR_H, Math.round((conf / max) * CHART_H)) : 0;
          const pipeH = pipe > 0 ? Math.max(MIN_BAR_H, Math.round((pipe / max) * CHART_H)) : 0;
          const isCurrent = m.month === currentKey;
          const totalAmt = conf + pipe;

          return (
            <div key={m.month} style={{ textAlign: 'center', minWidth: 54, flex: '0 0 54px' }}>
              {/* Value label above */}
              <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 3, minHeight: 12,
                color: conf > 0 ? '#1a7a3f' : pipe > 0 ? '#c86000' : T.muted }}>
                {totalAmt > 0 ? `$${Math.round(totalAmt / 1000)}k` : ''}
              </div>
              {/* Bar container — fixed height so all columns align */}
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'flex-end', height: CHART_H }}>
                {confH > 0 ? (
                  <div title={`Booked: $${conf.toLocaleString()}`}
                    style={{ width: 16, height: confH, background: '#1a7a3f', borderRadius: '3px 3px 0 0' }} />
                ) : (
                  <div style={{ width: 16, height: 0 }} />
                )}
                {pipeH > 0 ? (
                  <div title={`Pipeline: $${pipe.toLocaleString()}`}
                    style={{ width: 16, height: pipeH, background: '#f0c04099', borderRadius: '3px 3px 0 0', border: '1px solid #f0c040' }} />
                ) : (
                  <div style={{ width: 16, height: 0 }} />
                )}
              </div>
              {/* Month label */}
              <div style={{ fontSize: 9, marginTop: 4, fontWeight: isCurrent ? 700 : 400,
                color: isCurrent ? '#1a3a2a' : T.muted }}>
                {m.label}
              </div>
              {m.count > 0 && <div style={{ fontSize: 8, color: T.muted }}>{m.count}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10, color: T.muted }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a7a3f', marginRight: 4, borderRadius: 2 }} />Booked/Confirmed</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f0c04099', border: '1px solid #f0c040', marginRight: 4, borderRadius: 2 }} />Pipeline</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function HomeDashboard({ leads, onSelectLead, onAddLead }: {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  onAddLead: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    setDashLoading(true);
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setDashLoading(false); })
      .catch(() => setDashLoading(false));
  }, [leads.length]); // re-fetch when lead count changes, not on every re-render

  const overdue = leads.filter(l => l.followUpDate && new Date(l.followUpDate) < new Date());

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

      {/* ── Quick stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Leads', value: leads.length, color: '#1a3a2a' },
          { label: 'Confirmed Revenue', value: data ? `$${(data.confirmedRevenue ?? 0).toLocaleString()}` : '—', color: '#1a7a3f' },
          { label: 'Pipeline Value', value: data ? `$${(data.pipelineRevenue ?? 0).toLocaleString()}` : '—', color: '#c86000' },
          { label: 'Close Rate', value: data ? `${data.closeRate ?? 0}%` : '—', color: '#2a5f9e' },
          { label: 'Need Action', value: data?.needAction ?? '—', color: (data?.needAction ?? 0) > 0 ? '#cc0000' : '#222' },
          { label: 'Overdue Follow-Ups', value: overdue.length, color: overdue.length > 0 ? '#e05500' : '#222' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Georgia, serif' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Action items ── */}
      {!dashLoading && data && (data.noQuoteUrgent.length > 0 || data.neverCalled.length > 0 || overdue.length > 0) && (
        <div style={{ ...card, marginBottom: 20, borderLeft: '4px solid #cc0000' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#cc0000', marginBottom: 10 }}>🚨 Today&apos;s Action Items</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {data.noQuoteUrgent.length > 0 && (
              <div>
                <div style={T.label}>No quote sent — event within 7 days</div>
                {data.noQuoteUrgent.map(l => <MiniLeadRow key={l.id} lead={l} onSelect={onSelectLead} />)}
              </div>
            )}
            {data.neverCalled.length > 0 && (
              <div>
                <div style={T.label}>Critical/Urgent — never called</div>
                {data.neverCalled.map(l => <MiniLeadRow key={l.id} lead={l} onSelect={onSelectLead} />)}
              </div>
            )}
            {overdue.length > 0 && (
              <div>
                <div style={T.label}>Overdue follow-ups</div>
                {overdue.slice(0, 5).map(l => <MiniLeadRow key={l.id} lead={l} onSelect={onSelectLead} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── This week events ── */}
      {!dashLoading && data && data.thisWeekEvents.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 10 }}>🎯 Events This Week</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {data.thisWeekEvents.map(l => {
              const cfg = URGENCY_CONFIG[l.urgency];
              return (
                <div key={l.id} onClick={() => onSelectLead(l.id)} style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: l.depositPaid ? '#f0fff4' : '#fffdf0',
                  border: `1px solid ${l.depositPaid ? '#b2dfdb' : '#ffe0b2'}`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.primary }}>{l.clientName}</div>
                  <div style={{ fontSize: 12, color: T.secondary, marginTop: 2 }}>{l.eventDate} · {l.startTime || 'TBD'}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{l.packageName || '—'} · {l.eventCity || '—'}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.bg, color: '#fff', borderRadius: 8, padding: '1px 7px', fontSize: 10 }}>{cfg.label}</span>
                    {l.depositPaid && <span style={{ background: '#1a7a3f', color: 'white', borderRadius: 8, padding: '1px 7px', fontSize: 10 }}>✅ Deposit</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {data ? <RevenueChart data={data.monthlyRevenue} /> : (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: T.muted }}>
            {dashLoading ? 'Loading revenue data...' : 'No revenue data'}
          </div>
        )}
        {data ? <SourceChart data={data.sourceBreakdown} /> : (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: T.muted }}>
            {dashLoading ? 'Loading source data...' : 'No source data'}
          </div>
        )}
        <MiniCalendar leads={leads} />
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.primary, marginBottom: 12 }}>📈 Pipeline Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Leads', value: data?.totalLeads ?? leads.length },
              { label: 'Confirmed Won', value: data?.confirmedCount ?? '—' },
              { label: 'Contacted', value: data?.totalContacted ?? '—' },
              { label: 'Close Rate', value: data ? `${data.closeRate ?? 0}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a3a2a' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <button onClick={onAddLead} style={{
              width: '100%', padding: '10px', background: '#1a3a2a', color: 'white',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>➕ New Lead</button>
          </div>
        </div>
      </div>
    </div>
  );
}
