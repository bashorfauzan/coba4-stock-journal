// ─── IPO PAGE ─────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Rocket, User, Wallet } from 'lucide-react';

const fmt2 = (v: number) => new Intl.NumberFormat('id-ID').format(v);
const fmtCur2 = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

type IpoStatus = 'PESAN' | 'JATAH' | 'LISTING' | 'JUAL' | 'TIDAK_JATAH';
type IpoEntry = {
  id: string; emiten: string; hargaIpo: number; lotPesan: number; lotJatah: number;
  hargaJual: number;
  status: IpoStatus; broker: string; pemilik: string; catatan: string;
};

type AccountEntry = { 
  id: string; 
  nama: string; 
  rdn: string; 
  broker: string; 
  saldo: number; 
  catatan: string;
  feeBeli: number;
  feeJual: number;
};

const IPO_KEY = 'stock_journal_ipo';
const ACCOUNT_KEY = 'stock_journal_accounts';

const loadIpo = (): IpoEntry[] => { try { const r = localStorage.getItem(IPO_KEY); if (r) return JSON.parse(r); } catch {} return []; };
const saveIpoData = (l: IpoEntry[]) => localStorage.setItem(IPO_KEY, JSON.stringify(l));
const loadAccounts = (): AccountEntry[] => { try { const r = localStorage.getItem(ACCOUNT_KEY); if (r) return JSON.parse(r); } catch {} return []; };
const saveAccountsData = (l: AccountEntry[]) => localStorage.setItem(ACCOUNT_KEY, JSON.stringify(l));

// ─── IPO TRANSACTIONS ─────────────────────────────────────────────────────────
export type IpoTransaction = {
  id: string;
  ipoId: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  lot: number;
  hargaPerLembar: number;
  nilaiKotor: number;   // harga × lot × 100
  feePersen: number;    // 0 untuk BUY, feeJual akun untuk SELL
  feeAmount: number;
  nilaiTotal: number;   // nilaiKotor - feeAmount (net)
  broker: string;
  pemilik: string;
  createdAt: string;
};

const IPO_TX_KEY = 'stock_journal_ipo_transactions';
export const loadIpoTransactions = (): IpoTransaction[] => {
  try { const r = localStorage.getItem(IPO_TX_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
};
const saveIpoTransactions = (l: IpoTransaction[]) => localStorage.setItem(IPO_TX_KEY, JSON.stringify(l));

const STATUS_LABELS: Record<IpoStatus, { label: string; color: string; bg: string }> = {
  PESAN:       { label: 'Dipesan',      color: '#7C3AED', bg: '#EDE9FE' },
  JATAH:       { label: 'Dijatah',      color: '#2563EB', bg: '#DBEAFE' },
  LISTING:     { label: 'Listing',      color: '#D97706', bg: '#FEF3C7' },
  JUAL:        { label: 'Terjual',      color: '#059669', bg: '#D1FAE5' },
  TIDAK_JATAH: { label: 'Tidak Jatah', color: '#DC2626', bg: '#FEE2E2' },
};

const EMPTY_IPO: Omit<IpoEntry, 'id'> = {
  emiten: '', hargaIpo: 0, lotPesan: 0, lotJatah: 0, hargaJual: 0,
  status: 'PESAN', broker: 'RHB', pemilik: '', catatan: ''
};

export function IpoPage() {
  const [list, setList]         = useState<IpoEntry[]>(loadIpo);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<IpoEntry | null>(null);
  const [form, setForm]         = useState<Omit<IpoEntry, 'id'>>(EMPTY_IPO);

  const openAdd  = () => { setForm(EMPTY_IPO); setEditing(null); setShowForm(true); };
  const openEdit = (e: IpoEntry) => { setForm({ ...e }); setEditing(e); setShowForm(true); };

  const save = () => {
    const prevEntry = editing ? list.find(i => i.id === editing.id) : null;
    const entryId = editing?.id ?? Date.now().toString();
    const newEntry: IpoEntry = { ...form, id: entryId };

    // ── Logika bisnis: Status → JATAH ──────────────────────────────────────────
    if (form.status === 'JATAH' && prevEntry?.status !== 'JATAH' && form.lotJatah > 0) {
      // 1. Buat transaksi BUY IPO (tanpa fee)
      const existingTx = loadIpoTransactions();
      const alreadyBought = existingTx.some(t => t.ipoId === entryId && t.side === 'BUY');
      if (!alreadyBought) {
        const nilaiKotorBuy = form.hargaIpo * form.lotJatah * 100;
        const buyTx: IpoTransaction = {
          id: `ipo-buy-${entryId}`,
          ipoId: entryId,
          ticker: form.emiten,
          side: 'BUY',
          lot: form.lotJatah,
          hargaPerLembar: form.hargaIpo,
          nilaiKotor: nilaiKotorBuy,
          feePersen: 0,
          feeAmount: 0,
          nilaiTotal: nilaiKotorBuy,
          broker: form.broker,
          pemilik: form.pemilik,
          createdAt: new Date().toISOString(),
        };
        saveIpoTransactions([...existingTx, buyTx]);
      }


      // 2. Kembalikan saldo tidak jatah ke akun (lotPesan - lotJatah)
      const lotTidakJatah = form.lotPesan - form.lotJatah;
      if (lotTidakJatah > 0) {
        const refundAmount = form.hargaIpo * lotTidakJatah * 100;
        const accounts = loadAccounts();
        const updatedAccounts = accounts.map(a => {
          if (a.nama.toLowerCase() === form.pemilik.toLowerCase() &&
              a.broker.toLowerCase() === form.broker.toLowerCase()) {
            return { ...a, saldo: a.saldo + refundAmount };
          }
          return a;
        });
        saveAccountsData(updatedAccounts);
      }
    }

    // ── Logika bisnis: Status → JUAL ───────────────────────────────────────────
    if (form.status === 'JUAL' && prevEntry?.status !== 'JUAL' && form.lotJatah > 0 && form.hargaJual > 0) {
      const existingTx = loadIpoTransactions();
      const alreadySold = existingTx.some(t => t.ipoId === entryId && t.side === 'SELL');
      if (!alreadySold) {
        // Ambil fee jual dari akun sekuritas
        const accounts = loadAccounts();
        const matchAcc = accounts.find(a =>
          a.nama.toLowerCase() === form.pemilik.toLowerCase() &&
          a.broker.toLowerCase() === form.broker.toLowerCase()
        );
        const feeJualPersen = matchAcc?.feeJual ?? 0.29;
        const nilaiKotor = form.hargaJual * form.lotJatah * 100;
        const feeAmount = Math.round(nilaiKotor * (feeJualPersen / 100));
        const nilaiNet = nilaiKotor - feeAmount;

        const sellTx: IpoTransaction = {
          id: `ipo-sell-${entryId}`,
          ipoId: entryId,
          ticker: form.emiten,
          side: 'SELL',
          lot: form.lotJatah,
          hargaPerLembar: form.hargaJual,
          nilaiKotor,
          feePersen: feeJualPersen,
          feeAmount,
          nilaiTotal: nilaiNet,
          broker: form.broker,
          pemilik: form.pemilik,
          createdAt: new Date().toISOString(),
        };
        saveIpoTransactions([...existingTx, sellTx]);
      }
    }

    // ── Logika bisnis: Status → TIDAK_JATAH ───────────────────────────────────
    if (form.status === 'TIDAK_JATAH' && prevEntry?.status !== 'TIDAK_JATAH') {
      const refundAmount = form.hargaIpo * form.lotPesan * 100;
      if (refundAmount > 0) {
        const accounts = loadAccounts();
        const updatedAccounts = accounts.map(a => {
          if (a.nama.toLowerCase() === form.pemilik.toLowerCase() &&
              a.broker.toLowerCase() === form.broker.toLowerCase()) {
            return { ...a, saldo: a.saldo + refundAmount };
          }
          return a;
        });
        saveAccountsData(updatedAccounts);
      }
    }

    const updated = editing
      ? list.map(i => i.id === editing.id ? newEntry : i)
      : [...list, newEntry];
    setList(updated); saveIpoData(updated); setShowForm(false);
  };

  const del = (id: string) => { const u = list.filter(i => i.id !== id); setList(u); saveIpoData(u); };

  const pnl = (e: IpoEntry) =>
    e.lotJatah && e.hargaJual && e.hargaIpo ? (e.hargaJual - e.hargaIpo) * e.lotJatah * 100 : null;

  const inp = (label: string, key: keyof typeof form, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input type={type} value={(form as any)[key]}
        onChange={e => setForm(v => ({ ...v, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white', width: '100%' }}
      />
    </div>
  );

  const sold = list.filter(e => e.status === 'JUAL');
  const totalPnL = sold.reduce((s, e) => s + (pnl(e) ?? 0), 0);
  const isPos = totalPnL >= 0;

  return (
    <div className="page-content">
      {/* Summary strip */}
      {list.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Dipesan', value: String(list.length), color: 'var(--primary)' },
            { label: 'Dijatahkan', value: String(list.filter(e => e.lotJatah > 0).length), color: 'var(--success)' },
            { label: 'Sudah Dijual', value: String(sold.length), color: '#D97706' },
            { label: 'Total P&L IPO', value: fmtCur2(totalPnL), color: isPos ? 'var(--success)' : 'var(--danger)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card" style={{ padding: 14 }}>
              <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 'clamp(12px, 3vw, 16px)', fontWeight: 800, color, wordBreak: 'break-all' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Daftar IPO</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{list.length} IPO tercatat</div>
          </div>
          <button className="btn-primary" style={{ fontSize: 12, padding: '8px 14px', whiteSpace: 'nowrap' }} onClick={openAdd}>+ Tambah IPO</button>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">
            <Rocket size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ fontWeight: 700, fontSize: 14 }}>Belum ada catatan IPO</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Klik "+ Tambah IPO" untuk mulai mencatat</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: 16 }}>
            {list.map(e => {
              const profit = pnl(e);
              const isPro = (profit ?? 0) >= 0;
              const s = STATUS_LABELS[e.status];
              const nilaiPesan = e.hargaIpo * e.lotPesan * 100;
              const nilaiJatah = e.hargaIpo * e.lotJatah * 100;

              return (
                <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 16, background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.emiten}
                        <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {e.pemilik ? `${e.pemilik} • ` : ''}{e.broker}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                    {/* Nilai Pesan */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg-white)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>Pemesanan <br/> <strong style={{color: 'var(--text-primary)'}}>{fmt2(e.lotPesan)} Lot @ {fmt2(e.hargaIpo)}</strong></span>
                      <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Modal</span><br/>
                        <span style={{ fontWeight: 800 }}>{nilaiPesan > 0 ? fmtCur2(nilaiPesan) : '-'}</span>
                      </div>
                    </div>

                    {/* Nilai Jatah */}
                    {(e.status === 'JATAH' || e.status === 'LISTING' || e.status === 'JUAL') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg-white)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>Penjatahan <br/> <strong style={{color: 'var(--text-primary)'}}>{fmt2(e.lotJatah)} Lot</strong></span>
                        <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Nilai</span><br/>
                          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{nilaiJatah > 0 ? fmtCur2(nilaiJatah) : '-'}</span>
                        </div>
                      </div>
                    )}

                    {/* Harga Jual & PnL */}
                    {e.status === 'JUAL' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg-white)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>Terjual <br/> <strong style={{color: 'var(--text-primary)'}}>@ {fmt2(e.hargaJual)}</strong></span>
                        <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>P&L</span><br/>
                          <span style={{ fontWeight: 800, color: profit !== null ? (isPro ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
                            {profit !== null ? `${isPro ? '+' : ''}${fmtCur2(profit)}` : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                    <button onClick={() => openEdit(e)} style={{ flex: 1, background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✏️ Edit</button>
                    <button onClick={() => del(e.id)} style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{editing ? 'Edit IPO' : 'Tambah IPO Baru'}</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {inp('Emiten (Ticker)', 'emiten')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</label>
                <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as IpoStatus }))}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Akun Sekuritas (Broker)</label>
                <select 
                  value={`${form.pemilik}|${form.broker}`} 
                  onChange={e => {
                    const [pemilik, broker] = e.target.value.split('|');
                    setForm(v => ({ ...v, pemilik, broker }));
                  }}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                >
                  <option value="|">-- Pilih Akun Sekuritas --</option>
                  {(() => {
                    const freshAcc = loadAccounts();
                    return freshAcc.map(a => (
                      <option key={a.id} value={`${a.nama}|${a.broker}`}>
                        {a.broker} ({a.nama}) - Saldo +T2: {fmtCur2(a.saldo)}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              {inp('Harga IPO (Rp)', 'hargaIpo', 'number')}
              {inp('Lot Dipesan', 'lotPesan', 'number')}
              {inp('Lot Dijatahkan', 'lotJatah', 'number')}
              {inp('Harga Jual (Rp)', 'hargaJual', 'number')}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Catatan</label>
                <textarea value={form.catatan} onChange={e => setForm(v => ({ ...v, catatan: e.target.value }))} rows={2}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} placeholder="Catatan opsional..." />
              </div>
              {form.lotJatah > 0 && form.hargaJual > 0 && form.hargaIpo > 0 && (() => {
                const p = (form.hargaJual - form.hargaIpo) * form.lotJatah * 100;
                return (
                  <div style={{ gridColumn: '1 / -1', background: p >= 0 ? 'var(--success-light)' : 'var(--danger-light)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p >= 0 ? 'var(--success)' : 'var(--danger)' }}>Estimasi P&L</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: p >= 0 ? 'var(--success)' : 'var(--danger)' }}>{p >= 0 ? '+' : ''}{fmtCur2(p)}</span>
                  </div>
                );
              })()}
              
              {form.hargaIpo > 0 && form.lotPesan > 0 && (() => {
                const requiredFunds = form.hargaIpo * form.lotPesan * 100;
                const freshAccounts = loadAccounts();
                const matchingA = freshAccounts.find(a => a.nama.toLowerCase() === form.pemilik.toLowerCase() && a.broker.toLowerCase() === form.broker.toLowerCase());
                const currentSaldo = matchingA?.saldo ?? 0;
                const shortfall = requiredFunds - currentSaldo;
                
                return (
                  <div style={{ gridColumn: '1 / -1', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Kebutuhan Dana</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{fmtCur2(requiredFunds)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Saldo {matchingA ? `(${matchingA.nama} - ${matchingA.broker})` : 'Sekuritas'}</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{matchingA ? fmtCur2(currentSaldo) : 'Data akun tidak diisi/ditemukan'}</span>
                    </div>
                    
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-light)', marginTop: 8 }}>
                      {shortfall > 0 ? (
                        <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, lineHeight: 1.4 }}>
                          <span>⚠️</span>
                          <span>Saldo kurang <strong>{fmtCur2(shortfall)}</strong></span>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, lineHeight: 1.4 }}>
                          <span>✅</span>
                          <span>Saldo di sekuritas Anda mencukupi untuk pemesanan ini.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn-primary" onClick={save}>{editing ? 'Simpan Perubahan' : 'Tambah IPO'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNT SECTION (untuk Settings) ─────────────────────────────────────────
export function AccountSection() {
  const [accounts, setAccounts] = useState<AccountEntry[]>(loadAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<AccountEntry | null>(null);
  const [form, setForm]         = useState({ nama: '', rdn: '', broker: 'RHB', saldo: 0, catatan: '', feeBeli: 0.19, feeJual: 0.29 });
  const [saved, setSaved]       = useState(false);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const openAdd  = () => { setForm({ nama: '', rdn: '', broker: 'RHB', saldo: 0, catatan: '', feeBeli: 0.19, feeJual: 0.29 }); setEditing(null); setShowForm(true); };
  const openEdit = (a: AccountEntry) => { setForm({ ...a }); setEditing(a); setShowForm(true); };

  const save = () => {
    const updated = editing
      ? accounts.map(a => a.id === editing.id ? { ...form, id: editing.id } : a)
      : [...accounts, { ...form, id: Date.now().toString() }];
    setAccounts(updated); saveAccountsData(updated); setShowForm(false); flash();
  };

  const del = (id: string) => { const u = accounts.filter(a => a.id !== id); setAccounts(u); saveAccountsData(u); flash(); };

  const inp2 = (label: string, key: string, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => setForm(v => ({ ...v, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' }} />
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Informasi Akun Sekuritas</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Data akun, nomor RDN, dan saldo per pemilik</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>✓ Tersimpan!</span>}
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={openAdd}>+ Tambah</button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <User size={32} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Belum ada akun</p>
          <p style={{ fontSize: 12 }}>Tambah akun Bashor, Novan, dll</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: 16 }}>
          {accounts.map(a => (
            <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 16, background: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={18} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{a.nama}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.broker}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>No. RDN</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{a.rdn || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Wallet size={12} />Saldo</span>
                  <span style={{ fontWeight: 800, color: 'var(--success)' }}>{fmtCur2(a.saldo)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, background: 'var(--success-light)', color: 'var(--success)', padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                    Beli: {a.feeBeli ?? 0}%
                  </div>
                  <div style={{ flex: 1, background: 'var(--danger-light)', color: 'var(--danger)', padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                    Jual: {a.feeJual ?? 0}%
                  </div>
                </div>
                {a.catatan && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>{a.catatan}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button onClick={() => openEdit(a)} style={{ flex: 1, background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '6px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>✏️ Edit</button>
                <button onClick={() => del(a.id)} style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-2xl)', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{editing ? 'Edit Akun' : 'Tambah Akun Baru'}</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {inp2('Nama Pemilik', 'nama')}
              {inp2('Broker', 'broker')}
              <div style={{ gridColumn: '1 / -1' }}>{inp2('Nomor RDN', 'rdn')}</div>
              <div style={{ gridColumn: '1 / -1' }}>{inp2('Saldo Terakhir (Rp)', 'saldo', 'number')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {inp2('Fee Beli (%)', 'feeBeli', 'number')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {inp2('Fee Jual (%)', 'feeJual', 'number')}
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Catatan</label>
                <input value={form.catatan} onChange={e => setForm(v => ({ ...v, catatan: e.target.value }))}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} placeholder="Opsional..." />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn-primary" onClick={save}>{editing ? 'Simpan' : 'Tambah'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
