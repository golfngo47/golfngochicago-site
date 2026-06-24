'use client';
import { Lead, URGENCY_CONFIG } from './types';

const T = {
  primary: '#111',
  secondary: '#111',
  muted: '#222',
};

interface Props {
  leads: Lead[];
  loading?: boolean;
  onSync?: () => void;
}

export default function QuotesView({ leads, loading, onSync }: Props) {
  // Show all leads that have ANY Jobber data (quote sent, quoteAmount, quoteNumber, depositPaid)
  const withQuote = leads.filter(l => l.quoteSent || l.quoteAmount || l.quoteNumber || l.depositPaid);

  const confirmed = withQuote.filter(l => l.depositPaid || ['CONFIRMED', 'COMPLETED'].includes(l.urgency));
  const pending = withQuote.filter(l => !l.depositPaid && !['CONFIRMED', 'COMPLETED', 'LOST', 'PASSED'].includes(l.urgency));
  const closed = withQuote.filter(l => l.urgency === 'LOST' || l.urgency === 'PASSED');

  const totalQuoted = withQuote.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
  const totalConfirmed = confirmed.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
  const totalPending = pending.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);

  function QuoteRow({ lead }: { lead: Lead }) {
    const cfg = URGENCY_CONFIG[lead.urgency] || URGENCY_CONFIG.WARM;
    const amt = lead.quoteAmount || lead.packagePrice || 0;
    const matchConfidence = lead.quoteNumber ? '✅ Quote # matched' : lead.quoteAmount ? '⚠️ Matched by name' : '📋 Manual/email';
    const matchColor = lead.quoteNumber ? '#1a7a3f' : lead.quoteAmount ? '#c86000' : '#222';

    return (
      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
        <td style={{ padding: '11px 12px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: T.primary }}>{lead.clientName}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{lead.clientEmail}</div>
        </td>
        <td style={{ padding: '11px 12px' }}>
          {lead.quoteNumber ? (
            <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: T.secondary }}>
              #{lead.quoteNumber}
            </span>
          ) : <span style={{ color: T.muted }}>—</span>}
        </td>
        <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 700, color: '#1a3a2a' }}>
          {amt ? `$${amt.toLocaleString()}` : <span style={{ color: T.muted }}>—</span>}
        </td>
        <td style={{ padding: '11px 12px' }}>
          {lead.depositPaid ? (
            <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
              ✅ ${lead.depositAmount?.toLocaleString() || '?'} deposit
            </span>
          ) : (
            <span style={{ background: '#fff7ed', color: '#c2410c', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
              Pending
            </span>
          )}
        </td>
        <td style={{ padding: '11px 12px' }}>
          <span style={{ background: cfg.bg, color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
            {cfg.label}
          </span>
        </td>
        <td style={{ padding: '11px 12px' }}>
          <div style={{ fontSize: 12, color: T.secondary }}>{lead.eventDate || '—'}</div>
          {lead.eventCity && <div style={{ fontSize: 11, color: T.muted }}>{lead.eventCity}</div>}
        </td>
        <td style={{ padding: '11px 12px', fontSize: 10, color: matchColor, fontWeight: 600 }}>
          {matchConfidence}
        </td>
      </tr>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Quoted', value: withQuote.length, sub: totalQuoted ? `$${totalQuoted.toLocaleString()}` : null, color: '#1a3a2a' },
          { label: 'Confirmed / Booked', value: confirmed.length, sub: totalConfirmed ? `$${totalConfirmed.toLocaleString()}` : null, color: '#1a7a3f' },
          { label: 'Pending Response', value: pending.length, sub: totalPending ? `$${totalPending.toLocaleString()}` : null, color: '#c86000' },
          { label: 'Closed / Passed', value: closed.length, color: '#222' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Georgia, serif' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginTop: 1 }}>{s.sub}</div>}
            <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted, fontSize: 15 }}>
          Loading leads...
        </div>
      )}

      {!loading && withQuote.length === 0 && (
        <div style={{
          background: 'white', borderRadius: 12, padding: '40px 30px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center',
          borderTop: '4px solid #f0c040',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💲</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.primary, marginBottom: 8 }}>No quotes yet</div>
          <div style={{ fontSize: 14, color: T.secondary, maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Quotes appear here automatically when Jobber sends a copy email to
            {' '}<strong>sales@golfngochicago.com</strong>. Make sure to CC or BCC yourself on every quote you send.
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
            Subject lines Jobber uses: <em>&ldquo;[COPY] Quote #123&rdquo;</em>, <em>&ldquo;Deposit of $X was paid&rdquo;</em>
          </div>
          {onSync && (
            <button onClick={onSync} style={{
              background: '#1a3a2a', color: 'white', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              🔄 Sync Gmail Now
            </button>
          )}
        </div>
      )}

      {/* Quote tables */}
      {!loading && withQuote.length > 0 && (
        ['Confirmed/Booked', 'Pending', 'Closed/Passed'].map(section => {
          const sectionLeads =
            section === 'Confirmed/Booked' ? confirmed :
            section === 'Pending' ? pending : closed;
          if (sectionLeads.length === 0) return null;
          const sectionColor =
            section === 'Confirmed/Booked' ? '#1a7a3f' :
            section === 'Closed/Passed' ? '#222' : '#c86000';
          const sectionIcon =
            section === 'Confirmed/Booked' ? '✅' :
            section === 'Closed/Passed' ? '📁' : '⏳';

          return (
            <div key={section} style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, color: sectionColor }}>
                {sectionIcon} {section} ({sectionLeads.length})
              </div>
              <div style={{ background: 'white', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                      {['Client', 'Quote #', 'Amount', 'Deposit', 'Status', 'Event', 'Match'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionLeads.map(l => <QuoteRow key={l.id} lead={l} />)}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
