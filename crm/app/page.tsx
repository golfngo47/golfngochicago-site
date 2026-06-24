'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import HomeDashboard from '@/components/crm/HomeDashboard';
import LeadCard from '@/components/crm/LeadCard';
import NewLeadModal from '@/components/crm/NewLeadModal';
import QuotesView from '@/components/crm/QuotesView';
import SearchView from '@/components/crm/SearchView';
import { Lead, URGENCY_TABS, isStale } from '@/components/crm/types';

type NavTab = 'home' | 'pipeline' | 'quotes' | 'search';

// How long after the last "idle" moment before bars hide (ms)
const HIDE_DELAY = 2000;
// Grace period on first load before auto-hide kicks in (ms)
const GRACE_PERIOD = 3000;
// How many px from top/bottom edge re-triggers the bars
const EDGE_ZONE = 60;

export default function Page() {
  const [nav, setNav] = useState<NavTab>('home');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [focusLeadId, setFocusLeadId] = useState<string | null>(null);
  const [pipelineTab, setPipelineTab] = useState('CRITICAL');
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<'status' | 'eventDate' | 'name' | 'lastContact'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Auto-hide bars ─────────────────────────────────────────────────────────
  const [barsVisible, setBarsVisible] = useState(true);
  const barsVisibleRef = useRef(true);   // mirror for use inside event handlers
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(0);
  const NAV_H = 56; // fixed bottom nav height in px

  // Measure real header height after first render
  useEffect(() => {
    if (headerRef.current) setHeaderH(headerRef.current.offsetHeight);
  });

  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => {
      setBarsVisible(false);
      barsVisibleRef.current = false;
    }, HIDE_DELAY);
  }, [cancelHide]);

  const revealBars = useCallback(() => {
    setBarsVisible(true);
    barsVisibleRef.current = true;
    scheduleHide();
  }, [scheduleHide]);

  // Grace period on mount — bars visible for 3s, then auto-hide starts
  useEffect(() => {
    const t = setTimeout(scheduleHide, GRACE_PERIOD);
    return () => { clearTimeout(t); cancelHide(); };
  }, [scheduleHide, cancelHide]);

  // Global mouse move: reveal bars when in edge zones, schedule hide otherwise
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const y = e.clientY;
      const h = window.innerHeight;
      if (y < EDGE_ZONE || y > h - EDGE_ZONE) {
        // Near top or bottom edge — always show
        if (!barsVisibleRef.current) {
          setBarsVisible(true);
          barsVisibleRef.current = true;
        }
        cancelHide(); // hold open while near edge
      } else {
        // Away from edges — schedule hide if bars are currently visible
        if (barsVisibleRef.current && !hideTimer.current) {
          scheduleHide();
        }
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [cancelHide, scheduleHide]);

  // Mobile: any touch anywhere brings bars back for 3s
  useEffect(() => {
    function onTouch() { revealBars(); }
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, [revealBars]);

  const barTransition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease';

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    const res = await fetch('/api/leads?filter=all');
    const d = await res.json();
    setLeads(d.leads || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  function handleSelectLead(id: string) {
    setFocusLeadId(id);
    setPipelineTab('ALL');
    setNav('pipeline');
  }

  async function doSync() {
    setSyncing(true);
    setSyncMsg('Syncing Gmail...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const d = await res.json();
      setSyncMsg(`✓ ${d.leads_created || 0} new · ${d.leads_updated || 0} updated`);
      setLastSync(new Date().toLocaleTimeString());
      await loadLeads();
    } catch {
      setSyncMsg('Sync failed — check terminal');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 6000);
  }

  // ── Pipeline filter + sort ────────────────────────────────────────────────
  const URGENCY_ORDER: Record<string, number> = {
    CRITICAL: 1, URGENT: 2, HOT: 3, WARM: 4, COLD: 5,
    CONFIRMED: 6, COMPLETED: 7, PASSED: 8, LOST: 9,
  };

  const uniqueEventTypes = [...new Set(leads.map(l => l.eventType).filter(Boolean))];

  function filterAndSort(all: Lead[]): Lead[] {
    let filtered = pipelineTab === 'ALL' ? all : all.filter(l => l.urgency === pipelineTab);
    if (eventTypeFilter) filtered = filtered.filter(l => l.eventType === eventTypeFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(l =>
        l.clientName.toLowerCase().includes(s) ||
        l.clientEmail.toLowerCase().includes(s) ||
        l.eventCity.toLowerCase().includes(s) ||
        l.packageName.toLowerCase().includes(s)
      );
    }
    return [...filtered].sort((a, b) => {
      const now = Date.now();
      const ao = a.followUpDate && new Date(a.followUpDate).getTime() < now ? -1 : 0;
      const bo = b.followUpDate && new Date(b.followUpDate).getTime() < now ? -1 : 0;
      if (ao !== bo) return ao - bo;
      let cmp = 0;
      switch (sortKey) {
        case 'status': cmp = (URGENCY_ORDER[a.urgency] || 99) - (URGENCY_ORDER[b.urgency] || 99); break;
        case 'eventDate': cmp = (a.daysUntil ?? 99999) - (b.daysUntil ?? 99999); break;
        case 'name': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'lastContact': {
          const al = a.lastOutreachDate ? new Date(a.lastOutreachDate).getTime() : 0;
          const bl = b.lastOutreachDate ? new Date(b.lastOutreachDate).getTime() : 0;
          cmp = bl - al; break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const displayLeads = filterAndSort(leads);
  const countFor = (tab: string) => tab === 'ALL' ? leads.length : leads.filter(l => l.urgency === tab).length;
  const staleCount = leads.filter(l => isStale(l)).length;

  const confirmed = leads.filter(l => ['CONFIRMED', 'COMPLETED'].includes(l.urgency));
  const confirmedRev = confirmed.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
  const pipelineLeads = leads.filter(l => ['CRITICAL', 'URGENT', 'HOT', 'WARM', 'COLD'].includes(l.urgency));
  const pipelineRev = pipelineLeads.reduce((s, l) => s + (l.quoteAmount || l.packagePrice || 0), 0);
  const needAction = leads.filter(l => ['CRITICAL', 'URGENT'].includes(l.urgency)).length;

  const NAV_ITEMS: { id: NavTab; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'pipeline', icon: '📋', label: 'Pipeline' },
    { id: 'quotes', icon: '💲', label: 'Quotes' },
    { id: 'search', icon: '🔍', label: 'Search' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#f2f4f7', minHeight: '100vh' }}>

      {/* ── Top header — fixed, slides up when hidden ── */}
      <div
        ref={headerRef}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
        style={{
          background: 'linear-gradient(135deg, #0a2a18 0%, #1a3a2a 100%)',
          padding: '14px 20px',
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          transform: barsVisible ? 'translateY(0)' : 'translateY(-110%)',
          opacity: barsVisible ? 1 : 0,
          transition: barTransition,
          pointerEvents: barsVisible ? 'auto' : 'none',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: '#f0c040', textTransform: 'uppercase' }}>Golf &apos;n Go Chicago</div>
              <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', color: 'white', fontWeight: 700, lineHeight: 1.2 }}>GNG CRM</div>
              <div style={{ fontSize: 11, color: '#8aba9a', marginTop: 1 }}>
                {lastSync ? `Synced ${lastSync}` : 'Not synced'} · {leads.length} leads
                {syncMsg && <span style={{ marginLeft: 8, color: '#f0c040' }}>{syncMsg}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#7fff7f' }}>${confirmedRev.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: '#8aba9a' }}>Confirmed</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f0c040' }}>${pipelineRev.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: '#8aba9a' }}>Pipeline</div>
                </div>
                {needAction > 0 && (
                  <div style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid rgba(255,100,100,0.4)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ff8888' }}>{needAction}</div>
                    <div style={{ fontSize: 9, color: '#ff8888' }}>Action Needed</div>
                  </div>
                )}
              </div>
              <button onClick={() => setShowNewLead(true)} style={{
                background: '#f0c040', color: '#0a2a18', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>➕ New Lead</button>
              <button onClick={doSync} disabled={syncing} style={{
                background: syncing ? '#555' : 'rgba(255,255,255,0.15)', color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13,
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}>{syncing ? '⏳' : '🔄'} {syncing ? 'Syncing' : 'Sync Gmail'}</button>
              <a href="/api/export" style={{
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, textDecoration: 'none',
              }}>📥 CSV</a>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12, overflowX: 'auto' }}>
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => setNav(n.id)} style={{
                background: nav === n.id ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: nav === n.id ? 'white' : '#8aba9a',
                border: `1px solid ${nav === n.id ? 'rgba(255,255,255,0.3)' : 'transparent'}`,
                borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                fontSize: 13, fontWeight: nav === n.id ? 700 : 400, whiteSpace: 'nowrap',
              }}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content — padding transitions with the bars ── */}
      <div style={{
        paddingTop: barsVisible && headerH > 0 ? headerH : 0,
        paddingBottom: barsVisible ? NAV_H : 0,
        transition: 'padding-top 0.32s cubic-bezier(0.4,0,0.2,1), padding-bottom 0.32s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100vh',
      }}>

        <div style={{ display: nav === 'home' ? 'block' : 'none' }}>
          <HomeDashboard leads={leads} onSelectLead={handleSelectLead} onAddLead={() => setShowNewLead(true)} />
        </div>

        <div style={{ display: nav === 'pipeline' ? 'block' : 'none' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px' }}>
            {/* Urgency tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', overflowX: 'auto' }}>
              {URGENCY_TABS.map(tab => {
                const count = countFor(tab.id);
                const active = pipelineTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setPipelineTab(tab.id)} style={{
                    background: active ? tab.color : 'white', color: active ? 'white' : '#334155',
                    border: `2px solid ${tab.color}`, borderRadius: 20,
                    padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {tab.label}
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.25)' : tab.color,
                      color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 Search name, email, city..." value={search}
                onChange={e => setSearch(e.target.value)} style={{
                  flex: 1, minWidth: 180, padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #ddd', fontSize: 13, outline: 'none', color: '#111',
                }} />
              {uniqueEventTypes.length > 0 && (
                <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)} style={{
                  padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, color: '#111',
                }}>
                  <option value="">All event types</option>
                  {uniqueEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['status', 'eventDate', 'name', 'lastContact'] as const).map(k => (
                  <button key={k} onClick={() => {
                    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortKey(k); setSortDir('asc'); }
                  }} style={{
                    background: sortKey === k ? '#1a3a2a' : '#f0f0f0',
                    color: sortKey === k ? 'white' : '#111',
                    border: 'none', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {{ status: 'Status', eventDate: 'Date', name: 'A–Z', lastContact: 'Contact' }[k]}
                    {sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 11, color: '#222' }}>{displayLeads.length} leads</span>
              {staleCount > 0 && (
                <span style={{ background: '#ffebee', color: '#cc0000', borderRadius: 10, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                  ⚠️ {staleCount} stale
                </span>
              )}
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'minmax(150px,200px) 1fr 1fr 1fr auto',
              gap: 10, padding: '4px 16px', fontSize: 10, fontWeight: 700,
              color: '#222', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
            }}>
              <div>Name / City</div><div>Event Date</div><div>Quote</div><div>Last Contact</div>
              <div style={{ textAlign: 'right' }}>Status</div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#222' }}>Loading leads...</div>
            ) : displayLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#222', fontSize: 16 }}>
                {search ? `No leads matching "${search}"` : 'No leads in this category'}
              </div>
            ) : (
              displayLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onRefresh={loadLeads}
                  forceOpen={focusLeadId === lead.id}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ display: nav === 'quotes' ? 'block' : 'none' }}>
          <QuotesView leads={leads} loading={loading} onSync={doSync} />
        </div>

        <div style={{ display: nav === 'search' ? 'block' : 'none' }}>
          <SearchView leads={leads} onSelectLead={handleSelectLead} />
        </div>
      </div>

      {/* ── Bottom nav — fixed, slides down when hidden ── */}
      <div
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#1a3a2a', borderTop: '1px solid #2d5040',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: barsVisible ? 'translateY(0)' : 'translateY(110%)',
          opacity: barsVisible ? 1 : 0,
          transition: barTransition,
          pointerEvents: barsVisible ? 'auto' : 'none',
        }}
      >
        {NAV_ITEMS.map(n => (
          <button key={n.id} onClick={() => setNav(n.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 4px 10px',
            color: nav === n.id ? '#f0c040' : '#8aba9a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: nav === n.id ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{n.label}</span>
          </button>
        ))}
      </div>

      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={() => { setShowNewLead(false); loadLeads(); setNav('pipeline'); }}
        />
      )}
    </div>
  );
}
