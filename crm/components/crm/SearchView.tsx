'use client';
import { useState } from 'react';
import { Lead, URGENCY_CONFIG, ACTIVITY_COLORS } from './types';

const T = { primary: '#111', secondary: '#111', muted: '#222', border: '#e2e8f0' };

export default function SearchView({ leads, onSelectLead }: { leads: Lead[]; onSelectLead: (id: string) => void }) {
  const [q, setQ] = useState('');

  const results = q.trim().length < 2 ? [] : leads.filter(l => {
    const s = q.toLowerCase();
    return (
      l.clientName.toLowerCase().includes(s) ||
      l.clientEmail.toLowerCase().includes(s) ||
      l.clientPhone.includes(s) ||
      l.eventCity.toLowerCase().includes(s) ||
      l.packageName.toLowerCase().includes(s) ||
      l.eventDate.includes(s) ||
      l.eventType.toLowerCase().includes(s) ||
      l.source.toLowerCase().includes(s) ||
      (l.quoteNumber && String(l.quoteNumber).includes(s))
    );
  });

  function hi(text: string): React.ReactNode {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#fef08a', color: T.primary, borderRadius: 2 }}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'Georgia, serif', color: T.primary, marginBottom: 16 }}>
        🔍 Search Leads
      </div>
      <input
        autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
        placeholder="Name, email, phone, city, package, date, event type..."
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 8,
          border: '2px solid #1a3a2a', fontSize: 15, fontFamily: 'inherit',
          outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          color: T.primary,
        }}
      />

      {q.length > 0 && q.length < 2 && (
        <div style={{ color: T.muted, fontSize: 13 }}>Type at least 2 characters...</div>
      )}

      {results.length === 0 && q.length >= 2 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted, fontSize: 15 }}>
          No leads matching &ldquo;{q}&rdquo;
        </div>
      )}

      {results.map(lead => {
        const cfg = URGENCY_CONFIG[lead.urgency] || URGENCY_CONFIG.WARM;
        const actColor = ACTIVITY_COLORS[lead.activityStatus] || '#222';
        return (
          <div key={lead.id} onClick={() => onSelectLead(lead.id)} style={{
            background: 'white', border: `1px solid ${T.border}`,
            borderLeft: `5px solid ${cfg.border}`, borderRadius: 8,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Georgia, serif', color: T.primary }}>
                  {hi(lead.clientName)}
                </div>
                <div style={{ fontSize: 12, color: T.secondary, marginTop: 4 }}>
                  {lead.clientEmail && <span style={{ marginRight: 12 }}>✉️ {hi(lead.clientEmail)}</span>}
                  {lead.clientPhone && <span style={{ marginRight: 12 }}>📞 {hi(lead.clientPhone)}</span>}
                  {lead.eventCity && <span>📍 {hi(lead.eventCity)}</span>}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                  {lead.eventDate && <span style={{ marginRight: 12 }}>📅 {hi(lead.eventDate)}</span>}
                  {lead.packageName && <span style={{ marginRight: 12 }}>📦 {hi(lead.packageName)}</span>}
                  {lead.eventType && <span>🎉 {hi(lead.eventType)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <span style={{ background: cfg.bg, color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                <span style={{ background: actColor, color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>{lead.activityStatus}</span>
                {lead.quoteSent && (
                  <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    ${(lead.quoteAmount || lead.packagePrice)?.toLocaleString() || '?'} quoted
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {results.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 8 }}>
          {results.length} lead{results.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
