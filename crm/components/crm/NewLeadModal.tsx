'use client';
import { useState } from 'react';
import { PACKAGES, EVENT_TYPES, ACTIVITY_STATUSES, URGENCY_CONFIG } from './types';

const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const label: React.CSSProperties = { fontSize: 11, color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 3, display: 'block' };

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewLeadModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    eventDate: '', startTime: '', eventCity: '',
    packageName: PACKAGES[0].label, packagePrice: PACKAGES[0].price,
    eventType: '', source: '', guestCount: '',
    activityStatus: 'New Lead', urgency: 'URGENT',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<{ name: string; email: string } | null>(null);

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(force = false) {
    setError('');
    if (!form.clientName.trim()) { setError('Name is required'); return; }
    if (!form.clientPhone.trim() && !form.clientEmail.trim()) { setError('Phone or email is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _force: force }),
      });
      if (res.status === 409 && !force) {
        const d = await res.json();
        setDuplicate(d.existing);
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create lead');
        setSaving(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('Network error');
    }
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0a2a18, #1a3a2a)', borderRadius: '12px 12px 0 0', padding: '18px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#f0c040', textTransform: 'uppercase' }}>Golf 'n Go Chicago</div>
            <div style={{ fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 700, marginTop: 2 }}>➕ New Lead</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Duplicate warning */}
          {duplicate && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#856404', marginBottom: 6 }}>⚠️ Possible Duplicate</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                <strong>{duplicate.name}</strong> already exists with this email/phone.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => submit(true)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Create Anyway
                </button>
                <button onClick={() => setDuplicate(null)} style={{ background: '#f0f0f0', color: '#444', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{error}</div>}

          {/* Form grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Name *</label>
              <input style={input} value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Full name" autoFocus />
            </div>
            <div>
              <label style={label}>Phone *</label>
              <input style={input} value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} placeholder="(312) 555-0000" type="tel" />
            </div>
            <div>
              <label style={label}>Email</label>
              <input style={input} value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} placeholder="email@example.com" type="email" />
            </div>
            <div>
              <label style={label}>Event Date *</label>
              <input style={input} value={form.eventDate} onChange={e => set('eventDate', e.target.value)} type="date" />
            </div>
            <div>
              <label style={label}>Start Time</label>
              <input style={input} value={form.startTime} onChange={e => set('startTime', e.target.value)} type="time" />
            </div>
            <div>
              <label style={label}>City / Location</label>
              <input style={input} value={form.eventCity} onChange={e => set('eventCity', e.target.value)} placeholder="Chicago, IL" />
            </div>
            <div>
              <label style={label}>Event Type</label>
              <select style={input} value={form.eventType} onChange={e => set('eventType', e.target.value)}>
                <option value="">Select type...</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Package</label>
              <select style={input} value={form.packageName} onChange={e => {
                const pkg = PACKAGES.find(p => p.label === e.target.value);
                set('packageName', e.target.value);
                if (pkg) set('packagePrice', pkg.price);
              }}>
                {PACKAGES.map(p => <option key={p.label} value={p.label}>{p.label}{p.price ? ` — $${p.price.toLocaleString()}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>How They Found Us</label>
              <select style={input} value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="">Select...</option>
                {['Instagram/Facebook', 'Google', 'Referral', 'TikTok', 'JotForm', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Activity Status</label>
              <select style={input} value={form.activityStatus} onChange={e => set('activityStatus', e.target.value)}>
                {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Pipeline Priority</label>
              <select style={input} value={form.urgency} onChange={e => set('urgency', e.target.value)}>
                {['CRITICAL', 'URGENT', 'HOT', 'WARM', 'COLD'].map(u => (
                  <option key={u} value={u}>{URGENCY_CONFIG[u]?.label || u}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Notes</label>
              <textarea style={{ ...input, resize: 'vertical' }} value={form.notes}
                onChange={e => set('notes', e.target.value)} rows={3} placeholder="Any additional notes..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <button onClick={() => submit()} disabled={saving} style={{
              flex: 1, padding: '11px', background: '#1a3a2a', color: 'white',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Creating...' : '➕ Create Lead'}</button>
            <button onClick={onClose} style={{
              padding: '11px 20px', background: '#f0f0f0', color: '#555',
              border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
