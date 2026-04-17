// ─── IPO PAGE ─────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Rocket, User, Wallet } from 'lucide-react';

const fmt2 = (v: number) => new Intl.NumberFormat('id-ID').format(v);
const fmtCur2 = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

type IpoStatus = 'PESAN' | 'JATAH' | 'LISTING' | 'JUAL' | 'TIDAK_JATAH';
type IpoEntry = {
  id: string; emiten: string; hargaIpo: number; lotPesan: number; lotJatah: number;
  hargaJual: number; tanggalPesan: string; tanggalListing: string;
  status: IpoStatus; broker: string; pemilik: string; catatan: string;
};

const IPO_KEY = 'stock_journal_ipo';
const loadIpo = (): IpoEntry[] => { try { const r = localStorage.getItem(IPO_KEY); if (r) return JSON.parse(r); } catch {} return []; };
const saveIpoData = (l: IpoEntry[]) => localStorage.setItem(IPO_KEY, JSON.stringify(l));

const STATUS_LABELS: Record<IpoStatus, { label: string; color: string; bg: string }> = {
  PESAN:       { label: 'Dipesan',      color: '#7C3AED', bg: '#EDE9FE' },
  JATAH:       { label: 'Dijatah',      color: '#2563EB', bg: '#DBEAFE' },
  LISTING:     { label: 'Listing',      color: '#D97706', bg: '#FEF3C7' },
  JUAL:        { label: 'Terjual',      color: '#059669', bg: '#D1FAE5' },
  TIDAK_JATAH: { label: 'Tidak Jatah', color: '#DC2626', bg: '#FEE2E2' },
};

const EMPTY_IPO: Omit<IpoEntry, 'id'> = {
  emiten: '', hargaIpo: 0, lotPesan: 0, lotJatah: 0, hargaJual: 0,
  tanggalPesan: '', tanggalListing: '', status: 'PESAN', broker: 'RHB', pemilik: '', catatan: ''
};

export function IpoPage() {
  const [list, setList]         = useState<IpoEntry[]>(loadIpo);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<IpoEntry | null>(null);
  const [form, setForm]         = useState<Omit<IpoEntry, 'id'>>(EMPTY_IPO);

  const openAdd  = () => { setForm(EMPTY_IPO); setEditing(null); setShowForm(true); };
  const openEdit = (e: IpoEntry) => { setForm({ ...e }); setEditing(e); setShowForm(true); };

  const save = () => {
    const updated = editing
      ? list.map(i => i.id === editing.id ? { ...form, id: editing.id } : i)
      : [...list, { ...form, id: Date.now().toString() }];
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
          <div style={{ overflowX: 'auto' }}>
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Emiten</th>
                  <th>Pemilik</th>
                  <th>Broker</th>
                  <th style={{ textAlign: 'right' }}>Harga IPO</th>
                  <th style={{ textAlign: 'right' }}>Pesan</th>
                  <th style={{ textAlign: 'right' }}>Jatah</th>
                  <th style={{ textAlign: 'right' }}>Harga Jual</th>
                  <th style={{ textAlign: 'right' }}>P&L</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map(e => {
                  const profit = pnl(e);
                  const isPro = (profit ?? 0) >= 0;
                  const s = STATUS_LABELS[e.status];
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 800 }}>{e.emiten}</td>
                      <td style={{ fontSize: 12 }}>{e.pemilik || '-'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.broker}</td>
                      <td style={{ textAlign: 'right' }}>{e.hargaIpo ? fmt2(e.hargaIpo) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>{e.lotPesan ? fmt2(e.lotPesan) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{e.lotJatah ? fmt2(e.lotJatah) : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                      <td style={{ textAlign: 'right' }}>{e.hargaJual ? fmt2(e.hargaJual) : '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: profit !== null ? (isPro ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
                        {profit !== null ? `${isPro ? '+' : ''}${fmtCur2(profit)}` : '-'}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => openEdit(e)} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Edit</button>
                          <button onClick={() => del(e.id)} style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              {inp('Pemilik Akun', 'pemilik')}
              {inp('Broker', 'broker')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</label>
                <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as IpoStatus }))}
                  style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {inp('Harga IPO (Rp)', 'hargaIpo', 'number')}
              {inp('Lot Dipesan', 'lotPesan', 'number')}
              {inp('Lot Dijatahkan', 'lotJatah', 'number')}
              {inp('Harga Jual (Rp)', 'hargaJual', 'number')}
              {inp('Tgl Pemesanan', 'tanggalPesan', 'date')}
              {inp('Tgl Listing', 'tanggalListing', 'date')}
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
type AccountEntry = { id: string; nama: string; rdn: string; broker: string; saldo: number; catatan: string };
const ACCOUNT_KEY = 'stock_journal_accounts';
const loadAccounts = (): AccountEntry[] => { try { const r = localStorage.getItem(ACCOUNT_KEY); if (r) return JSON.parse(r); } catch {} return []; };
const saveAccountsData = (l: AccountEntry[]) => localStorage.setItem(ACCOUNT_KEY, JSON.stringify(l));

export function AccountSection() {
  const [accounts, setAccounts] = useState<AccountEntry[]>(loadAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<AccountEntry | null>(null);
  const [form, setForm]         = useState({ nama: '', rdn: '', broker: 'RHB', saldo: 0, catatan: '' });
  const [saved, setSaved]       = useState(false);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const openAdd  = () => { setForm({ nama: '', rdn: '', broker: 'RHB', saldo: 0, catatan: '' }); setEditing(null); setShowForm(true); };
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
                {a.catatan && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{a.catatan}</div>}
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
