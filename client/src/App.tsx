import { useEffect, useState } from 'react';
import './index.css';
import type { StockSummary, StockPosition, StockTransaction } from './api';
import {
  Sidebar, BottomNav, Topbar,
  DashboardPage, PortfolioPage, TransactionsPage, SettingsPage,
  type PageId
} from './components/Layout';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary]           = useState<StockSummary | null>(null);
  const [positions, setPositions]       = useState<StockPosition[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { supabase } = await import('./lib/supabase');

        const [{ data: txData, error: txErr }, { data: notifData, error: notifErr }] = await Promise.all([
          supabase.from('StockTransaction').select('*').order('tradedAt', { ascending: false }),
          supabase.from('StockNotification').select('*').order('receivedAt', { ascending: false }).limit(100),
        ]);

        if (txErr) throw txErr;
        if (notifErr) throw notifErr;
        if (!active) return;

        const txs  = (txData  || []) as StockTransaction[];
        const notifs = (notifData || []) as { length: number };

        // ── Summary ──────────────────────────────────────────────────
        const sum: StockSummary = { notifications: notifs.length, transactions: txs.length, buyCount: 0, sellCount: 0, buyValue: 0, sellValue: 0, realizedProfit: 0 };
        txs.forEach(tx => {
          if (tx.status === 'MATCHED') {
            if (tx.side === 'BUY')  { sum.buyValue  += tx.netValue; sum.buyCount++;  }
            else                    { sum.sellValue += tx.netValue; sum.sellCount++; }
          }
        });

        // ── Positions (FIFO avg cost) ─────────────────────────────────
        const matched = [...txs]
          .filter(t => t.status === 'MATCHED')
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
        sum.realizedProfit = pos.reduce((s, p) => s + p.realizedProfit, 0);

        setSummary(sum);
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

        {page === 'dashboard'    && <DashboardPage    summary={summary} positions={positions} transactions={transactions} error={error} />}
        {page === 'portfolio'    && <PortfolioPage    positions={positions} />}
        {page === 'transactions' && <TransactionsPage transactions={transactions} />}
        {page === 'settings'     && <SettingsPage />}
      </div>

      <BottomNav active={page} onNav={setPage} />
    </div>
  );
}

export default App;
