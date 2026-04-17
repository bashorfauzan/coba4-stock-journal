import { useState } from 'react';
import {
  LayoutDashboard, PieChart, ClipboardList, Settings,
  TrendingUp, TrendingDown, AlertCircle, Rocket
} from 'lucide-react';
import type { StockSummary, StockPosition, StockTransaction } from '../api';
import { AccountSection } from './IpoAccount';


// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('id-ID').format(v);
const fmtCur = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const fmtDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '-';
const fmtCompact = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '-';

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────
export type PageId = 'dashboard' | 'portfolio' | 'transactions' | 'ipo' | 'settings';

interface NavItemDef { id: PageId; label: string; Icon: any; }
const NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard',    label: 'Dashboard',     Icon: LayoutDashboard },
  { id: 'portfolio',    label: 'Portofolio',    Icon: PieChart },
  { id: 'transactions', label: 'Transaksi',     Icon: ClipboardList },
  { id: 'ipo',          label: 'IPO',           Icon: Rocket },
  { id: 'settings',     label: 'Pengaturan',    Icon: Settings },
];

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
export function Sidebar({ active, onNav }: { active: PageId; onNav: (p: PageId) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <TrendingUp size={18} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Stock Journal</span>
          <span className="sidebar-logo-sub">Portofolio Saham</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Menu</span>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item${active === id ? ' active' : ''}`}
            onClick={() => onNav(id)}
          >
            <span className="nav-item-icon"><Icon size={18} /></span>
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 10px' }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Auto-Sync</div>
          <div>Sync otomatis setiap 15 detik</div>
        </div>
      </div>
    </aside>
  );
}

// ─── BOTTOM NAV (Mobile) ─────────────────────────────────────────────────────
export function BottomNav({ active, onNav }: { active: PageId; onNav: (p: PageId) => void }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-item${active === id ? ' active' : ''}`}
          onClick={() => onNav(id)}
        >
          <Icon size={22} className="bottom-nav-icon" />
          {label}
        </button>
      ))}
    </nav>
  );
}

// ─── TOPBAR ─────────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<PageId, { title: string; sub: string }> = {
  dashboard:    { title: 'Dashboard',           sub: 'Ringkasan portofolio investasi Anda' },
  portfolio:    { title: 'Portofolio',          sub: 'Saham yang sedang Anda pegang' },
  transactions: { title: 'Riwayat Transaksi',  sub: 'Semua transaksi BUY / SELL tercatat' },
  ipo:          { title: 'IPO',                 sub: 'Pencatatan pemesanan & hasil IPO saham' },
  settings:     { title: 'Pengaturan',          sub: 'Konfigurasi aplikasi & akun' },
};

export function Topbar({ page, syncing }: { page: PageId; syncing: boolean }) {
  const { title, sub } = PAGE_TITLES[page];
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{title}</span>
        <span className="topbar-sub">{sub}</span>
      </div>
      <div className="topbar-right">
        <div className={`status-badge${syncing ? '' : ''}`}>
          <span className="status-dot" />
          {syncing ? 'Memuat...' : 'Live'}
        </div>
      </div>
    </header>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export function DashboardPage({
  summary, positions, transactions, error
}: {
  summary: StockSummary | null;
  positions: StockPosition[];
  transactions: StockTransaction[];
  error: string | null;
}) {
  const pnl = summary?.realizedProfit ?? 0;
  const isProfit = pnl >= 0;

  return (
    <div className="page-content">
      {error && (
        <div style={{
          background: 'var(--danger-light)', color: 'var(--danger)',
          borderRadius: 'var(--radius-lg)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          border: '1px solid rgba(239,68,68,0.2)', fontSize: 13
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Hero Card */}
      <div className="hero-card">
        <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Total Realized P&L
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 'clamp(24px, 6vw, 40px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            {summary ? fmtCur(pnl) : '—'}
          </span>
          {summary && (
            <span style={{
              background: isProfit ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
              color: isProfit ? '#6EE7B7' : '#FCA5A5',
              padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginBottom: 4
            }}>
              {isProfit ? '▲' : '▼'} {isProfit ? 'Cuan' : 'Rugi'}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 20px' }}>
          {[
            { label: 'Total Beli', value: summary ? fmtCur(summary.buyValue) : '—' },
            { label: 'Total Jual', value: summary ? fmtCur(summary.sellValue) : '—' },
            { label: 'Transaksi Match', value: summary ? fmt(summary.transactions) : '—' },
            { label: 'Emiten Aktif', value: String(positions.filter(p => p.netLots > 0).length) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, opacity: 0.65, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 15, fontWeight: 800 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard title="Realized P&L" value={summary ? fmtCur(pnl) : '...'} accent={isProfit ? 'success' : 'danger'} Icon={isProfit ? TrendingUp : TrendingDown} />
        <StatCard title="Total Beli" value={summary ? fmtCur(summary.buyValue) : '...'} accent="primary" Icon={TrendingUp} />
        <StatCard title="Total Jual" value={summary ? fmtCur(summary.sellValue) : '...'} accent="warning" Icon={TrendingDown} />
        <StatCard title="Transaksi" value={summary ? fmt(summary.transactions) : '...'} accent="neutral" Icon={ClipboardList} />
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Transaksi Terbaru</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>5 transaksi terakhir</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <TransactionTable transactions={transactions.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
type AccentType = 'primary' | 'success' | 'danger' | 'warning' | 'neutral';
const ACCENT_MAP: Record<AccentType, { bg: string; color: string; iconBg: string }> = {
  primary: { bg: 'var(--primary-light)', color: 'var(--primary)', iconBg: 'var(--primary)' },
  success: { bg: 'var(--success-light)', color: 'var(--success)', iconBg: 'var(--success)' },
  danger:  { bg: 'var(--danger-light)',  color: 'var(--danger)',  iconBg: 'var(--danger)' },
  warning: { bg: 'var(--warning-light)', color: 'var(--warning)', iconBg: 'var(--warning)' },
  neutral: { bg: 'var(--border-light)',  color: 'var(--text-secondary)', iconBg: '#9CA3AF' },
};

function StatCard({ title, value, accent, Icon }: { title: string; value: string; accent: AccentType; Icon: any }) {
  const { iconBg } = ACCENT_MAP[accent];
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}>{title}</p>
          <p style={{ fontSize: 'clamp(13px, 3.5vw, 18px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, lineHeight: 1.2, wordBreak: 'break-all' }}>{value}</p>
        </div>
        <div style={{ background: iconBg, borderRadius: 10, width: 34, height: 34, minWidth: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color="white" />
        </div>
      </div>
    </div>
  );
}

// ─── PORTFOLIO PAGE ───────────────────────────────────────────────────────────
export function PortfolioPage({ positions }: { positions: StockPosition[] }) {
  const [search, setSearch] = useState('');
  const filtered = positions.filter(p => p.ticker.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(p => p.netLots > 0);
  const closed = filtered.filter(p => p.netLots <= 0);

  return (
    <div className="page-content">
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="input-field search-bar"
            style={{ paddingLeft: 38 }}
            placeholder="Cari ticker saham..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Active Positions */}
      {active.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Posisi Aktif</h2>
            <span style={{ background: 'var(--success-light)', color: 'var(--success)', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {active.length} Emiten
            </span>
          </div>
          <div className="portfolio-grid">
            {active.map(pos => <PositionCard key={pos.ticker} pos={pos} />)}
          </div>
        </div>
      )}

      {/* Closed Positions */}
      {closed.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)' }}>Posisi Tutup</h2>
            <span className="badge badge-neutral">{closed.length}</span>
          </div>
          <div className="portfolio-grid">
            {closed.map(pos => <PositionCard key={pos.ticker} pos={pos} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          <PieChart size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Portofolio Kosong</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Transaksi matched akan otomatis tampil di sini</p>
        </div>
      )}
    </div>
  );
}

function PositionCard({ pos }: { pos: StockPosition }) {
  const isActive = pos.netLots > 0;
  const hasPnL = pos.realizedProfit !== 0;
  const isProfit = pos.realizedProfit >= 0;

  return (
    <div className="portfolio-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isActive ? 'linear-gradient(135deg, #EEF1FE, #DDE3FD)' : 'var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${isActive ? 'rgba(79,110,247,0.15)' : 'var(--border)'}`,
          }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
              {pos.ticker.substring(0, 2)}
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>{pos.ticker}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{fmtCompact(pos.lastTradeAt)}</div>
          </div>
        </div>
        <span className={`badge ${isActive ? 'badge-matched' : 'badge-neutral'}`}>
          {fmt(pos.netLots)} Lot
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 3 }}>Beli / Jual</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(pos.buyLots)} <span style={{ color: 'var(--text-muted)' }}>/</span> {fmt(pos.sellLots)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 3 }}>Avg. Beli</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtCur(pos.avgBuyPrice)}</div>
        </div>

        {hasPnL && (
          <div style={{ gridColumn: '1 / -1', marginTop: 2, background: isProfit ? 'var(--success-light)' : 'var(--danger-light)', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
              Realized P&L
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
              {isProfit ? '+' : ''}{fmtCur(pos.realizedProfit)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRANSACTIONS PAGE ────────────────────────────────────────────────────────
export function TransactionsPage({ transactions }: { transactions: StockTransaction[] }) {
  const [search, setSearch] = useState('');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = transactions.filter(tx => {
    const matchSearch = tx.ticker.toLowerCase().includes(search.toLowerCase()) ||
      (tx.sourceApp ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSide = filterSide === 'ALL' || tx.side === filterSide;
    return matchSearch && matchSide;
  });

  return (
    <div className="page-content">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input className="input-field" style={{ paddingLeft: 38, width: '100%' }} placeholder="Cari ticker atau broker..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'BUY', 'SELL'] as const).map(s => (
            <button key={s} onClick={() => setFilterSide(s)} style={{
              padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: filterSide === s ? (s === 'BUY' ? 'var(--success)' : s === 'SELL' ? 'var(--danger)' : 'var(--primary)') : 'var(--bg-white)',
              color: filterSide === s ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>{s === 'ALL' ? 'Semua' : s}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Riwayat Transaksi</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{filtered.length} transaksi ditemukan</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {filtered.length > 0
            ? <TransactionTable transactions={filtered} showBroker />
            : (
              <div className="empty-state">
                <ClipboardList size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
                <p style={{ fontWeight: 700, fontSize: 14 }}>Tidak ada transaksi</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

function TransactionTable({ transactions, showBroker = false }: { transactions: StockTransaction[]; showBroker?: boolean }) {
  return (
    <table className="styled-table">
      <thead>
        <tr>
          <th>Waktu</th>
          <th>Ticker</th>
          {showBroker && <th>Broker</th>}
          <th>Tipe</th>
          <th style={{ textAlign: 'right' }}>Lot</th>
          <th style={{ textAlign: 'right' }}>Harga</th>
          <th style={{ textAlign: 'right' }}>Net Value</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(tx => (
          <tr key={tx.id}>
            <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(tx.tradedAt)}</td>
            <td style={{ fontWeight: 800, letterSpacing: -0.3 }}>{tx.ticker}</td>
            {showBroker && <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tx.sourceApp ?? '-'}</td>}
            <td><span className={`badge ${tx.side === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{tx.side}</span></td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(tx.lot)}</td>
            <td style={{ textAlign: 'right' }}>{fmt(tx.pricePerShare)}</td>
            <td style={{ textAlign: 'right', fontWeight: 800 }}>{fmtCur(tx.netValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
type FeeEntry = { name: string; buy: string; sell: string };

const DEFAULT_BROKERS: FeeEntry[] = [
  { name: 'RHB',              buy: '0.19', sell: '0.29' },
  { name: 'Ajaib',            buy: '0.10', sell: '0.20' },
  { name: 'Stockbit',         buy: '0.10', sell: '0.20' },
  { name: 'IPOT',             buy: '0.19', sell: '0.29' },
  { name: 'Mirae',            buy: '0.18', sell: '0.28' },
  { name: 'BIONS (BNI)',      buy: '0.17', sell: '0.27' },
  { name: 'Phillip POEMS',    buy: '0.20', sell: '0.28' },
  { name: 'Mandiri Online',   buy: '0.19', sell: '0.29' },
];

const STORAGE_KEY = 'stock_journal_fee_config';

function loadBrokers(): FeeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FeeEntry[];
  } catch {}
  return DEFAULT_BROKERS;
}

function saveBrokers(list: FeeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function SettingsPage() {
  const webhookUrl = 'https://coba4-stock-journal.vercel.app/api/webhook';
  const [copied, setCopied] = useState(false);
  const [brokers, setBrokers] = useState<FeeEntry[]>(loadBrokers);
  const [editing, setEditing] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<FeeEntry>({ name: '', buy: '', sell: '' });
  const [adding, setAdding] = useState(false);
  const [newBroker, setNewBroker] = useState<FeeEntry>({ name: '', buy: '', sell: '' });
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (i: number) => {
    setEditing(i);
    setEditBuf({ ...brokers[i] });
  };

  const saveEdit = () => {
    if (editing === null) return;
    const updated = brokers.map((b, i) => i === editing ? { ...editBuf } : b);
    setBrokers(updated);
    saveBrokers(updated);
    setEditing(null);
    flashSaved();
  };

  const cancelEdit = () => setEditing(null);

  const deleteBroker = (i: number) => {
    const updated = brokers.filter((_, idx) => idx !== i);
    setBrokers(updated);
    saveBrokers(updated);
    flashSaved();
  };

  const addBroker = () => {
    if (!newBroker.name.trim()) return;
    const updated = [...brokers, { ...newBroker }];
    setBrokers(updated);
    saveBrokers(updated);
    setNewBroker({ name: '', buy: '', sell: '' });
    setAdding(false);
    flashSaved();
  };

  const resetDefaults = () => {
    setBrokers(DEFAULT_BROKERS);
    saveBrokers(DEFAULT_BROKERS);
    setEditing(null);
    setAdding(false);
    flashSaved();
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
    fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)',
    background: 'var(--bg-white)', outline: 'none', width: '100%',
  };

  return (
    <div className="page-content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

        {/* Account Info */}
        <AccountSection />

        {/* Webhook Info */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div style={{ fontWeight: 700, fontSize: 15 }}>Webhook Endpoint</div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Gunakan URL ini di aplikasi Android Helper Anda untuk mengirim notifikasi broker secara otomatis ke database.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                flex: 1, minWidth: 200, background: 'var(--bg-app)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace',
                color: 'var(--primary)', wordBreak: 'break-all'
              }}>
                {webhookUrl}
              </code>
              <button className="btn-primary" onClick={handleCopy}>
                {copied ? '✓ Tersalin!' : 'Salin URL'}
              </button>
            </div>
            <div style={{ marginTop: 14, padding: 12, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--primary)' }}>
              <span>ℹ️</span>
              <span>URL ini menerima <strong>POST request</strong> dari HP Android. Membuka di browser akan muncul "Method not allowed" — itu normal.</span>
            </div>
          </div>
        </div>

        {/* Fee Broker Editable */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Konfigurasi Fee Broker</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Klik ✏️ pada baris untuk mengubah. Tambah sekuritas baru dengan tombol di bawah.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {saved && (
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>✓ Tersimpan!</span>
              )}
              <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={resetDefaults}>
                Reset Default
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Sekuritas</th>
                  <th style={{ textAlign: 'right' }}>Fee Beli (%)</th>
                  <th style={{ textAlign: 'right' }}>Fee Jual (%)</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((b, i) => editing === i ? (
                  <tr key={i} style={{ background: 'var(--primary-light)' }}>
                    <td>
                      <input
                        style={inputStyle}
                        value={editBuf.name}
                        onChange={e => setEditBuf(v => ({ ...v, name: e.target.value }))}
                        placeholder="Nama sekuritas"
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...inputStyle, textAlign: 'right' }}
                        value={editBuf.buy}
                        onChange={e => setEditBuf(v => ({ ...v, buy: e.target.value }))}
                        placeholder="0.19"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...inputStyle, textAlign: 'right' }}
                        value={editBuf.sell}
                        onChange={e => setEditBuf(v => ({ ...v, sell: e.target.value }))}
                        placeholder="0.29"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={saveEdit} style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Simpan</button>
                        <button onClick={cancelEdit} style={{ background: 'var(--border-light)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{b.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-buy">{b.buy}%</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-sell">{b.sell}%</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(i)}
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >✏️ Edit</button>
                        <button
                          onClick={() => deleteBroker(i)}
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Add new broker row */}
                {adding && (
                  <tr style={{ background: '#F0FFF4' }}>
                    <td>
                      <input
                        style={inputStyle}
                        value={newBroker.name}
                        onChange={e => setNewBroker(v => ({ ...v, name: e.target.value }))}
                        placeholder="Nama sekuritas baru..."
                        autoFocus
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...inputStyle, textAlign: 'right' }}
                        value={newBroker.buy}
                        onChange={e => setNewBroker(v => ({ ...v, buy: e.target.value }))}
                        placeholder="0.19"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...inputStyle, textAlign: 'right' }}
                        value={newBroker.sell}
                        onChange={e => setNewBroker(v => ({ ...v, sell: e.target.value }))}
                        placeholder="0.29"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={addBroker} style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Tambah</button>
                        <button onClick={() => setAdding(false)} style={{ background: 'var(--border-light)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!adding && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)' }}>
              <button
                className="btn-primary"
                style={{ fontSize: 13 }}
                onClick={() => { setAdding(true); setEditing(null); }}
              >
                + Tambah Sekuritas Baru
              </button>
            </div>
          )}
        </div>

        {/* Sync Info */}
        <div className="card">
          <div className="card-header"><div style={{ fontWeight: 700, fontSize: 15 }}>Auto Sync</div></div>
          <div className="card-body">
            <div className="settings-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Interval Refresh</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Data diperbarui setiap interval ini</div>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>15 detik</span>
            </div>
            <div className="settings-item">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Sumber Data</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Koneksi database</div>
              </div>
              <span className="badge badge-matched">Supabase</span>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="card">
          <div className="card-header"><div style={{ fontWeight: 700, fontSize: 15 }}>Informasi Aplikasi</div></div>
          <div className="card-body">
            {[
              { label: 'Versi Aplikasi', value: 'v1.0.0' },
              { label: 'Hosting', value: 'Vercel (Free)' },
              { label: 'Database', value: 'Supabase PostgreSQL' },
              { label: 'Broker Didukung', value: `${brokers.length} sekuritas terdaftar` },
            ].map(({ label, value }) => (
              <div key={label} className="settings-item">
                <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


