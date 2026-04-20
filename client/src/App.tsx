import { useEffect, useState } from 'react';
import './index.css';
import type { StockPosition, StockTransaction } from './api';
import {
  Sidebar, BottomNav, Topbar,
  DashboardPage, PortfolioPage, TransactionsPage, SettingsPage,
  type PageId
} from './components/Layout';
import { IpoPage } from './components/IpoAccount';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [loading, setLoading] = useState(true);

  const [positions, setPositions]       = useState<StockPosition[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { supabase } = await import('./lib/supabase');

        const { data: txData, error: txErr } = await supabase.from('StockTransaction').select('*').eq('status', 'MATCHED').order('tradedAt', { ascending: false });

        if (txErr) throw txErr;
        if (!active) return;

        // Hanya transaksi MATCHED yang diproses (filter ganda: sudah difilter di query, dicek lagi di sini)
        const txs  = ((txData  || []) as StockTransaction[]).filter(t => t.status === 'MATCHED');

        // ── Positions (FIFO avg cost) ─────────────────────────────────
        // txs sudah MATCHED semua, langsung sort untuk FIFO
        const matched = [...txs]
          .sort((a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime());

        const map = new Map<string, StockPosition>();
        for (const tx of matched) {
          const cur = map.get(tx.ticker) ?? { ticker: tx.ticker, netLots: 0, buyLots: 0, sellLots: 0, avgBuyPrice: 0, realizedSellValue: 0, realizedProfit: 0, lastTradeAt: null };
          if (tx.side === 'BUY') {
            const nextLots = cur.netLots + tx.lot;
            cur.avgBuyPrice = nextLots > 0 ? (cur.avgBuyPrice * cur.netLots + tx.pricePerShare * tx.lot) / nextLots : 0;
            cur.buyLots  += tx.lot;
            cur.netLots   = nextLots;
          } else {
            const profit = tx.netValue - cur.avgBuyPrice * tx.lot * 100;
            cur.realizedProfit += profit;
            cur.sellLots += tx.lot;
            cur.netLots  -= tx.lot;
            cur.realizedSellValue += tx.netValue;
          }
          cur.lastTradeAt = tx.tradedAt;
          map.set(tx.ticker, cur);
        }

        const pos = Array.from(map.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));

        setPositions(pos);
        setTransactions(txs);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Gagal memuat data dari Supabase');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar active={page} onNav={setPage} />

      <div className="main-wrapper">
        <Topbar page={page} syncing={loading} />

        {page === 'dashboard'    && <DashboardPage    positions={positions} transactions={transactions} error={error} />}
        {page === 'portfolio'    && <PortfolioPage    positions={positions} />}
        {page === 'transactions' && <TransactionsPage transactions={transactions} />}
        {page === 'ipo'          && <IpoPage />}
        {page === 'settings'     && <SettingsPage />}
      </div>

      <BottomNav active={page} onNav={setPage} />
    </div>
  );
}

export default App;
