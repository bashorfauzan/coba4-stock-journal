import { useEffect, useState } from 'react';
import { Activity, BellRing, CandlestickChart, Wallet, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

import { type StockNotification, type StockPosition, type StockSummary, type StockTransaction } from './api';
import { StatCard } from './components/StatCard';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID').format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value))
    : '-';

const formatCompactDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value))
    : '-';

function App() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        
        // Ambil Data Transaksi
        const { data: txData, error: txError } = await supabase
          .from('StockTransaction')
          .select('*')
          .order('tradedAt', { ascending: false });

        if (txError) throw txError;

        // Ambil Data Notifikasi
        const { data: notifData, error: notifError } = await supabase
          .from('StockNotification')
          .select('*')
          .order('receivedAt', { ascending: false })
          .limit(100);

        if (notifError) throw notifError;

        if (!active) return;

        const transactionsRes = (txData || []) as StockTransaction[];
        const notificationsRes = (notifData || []) as StockNotification[];

        // Hitung Summary secara lokal
        const summaryCalc: StockSummary = {
          notifications: notificationsRes.length, // Menampilkan yg dilimit/total dari Inbox
          transactions: transactionsRes.length,
          buyCount: 0,
          sellCount: 0,
          buyValue: 0,
          sellValue: 0
        };

        transactionsRes.forEach((tx) => {
          if (tx.status === 'MATCHED') {
            if (tx.side === 'BUY') {
              summaryCalc.buyValue += tx.netValue;
              summaryCalc.buyCount += 1;
            } else {
              summaryCalc.sellValue += tx.netValue;
              summaryCalc.sellCount += 1;
            }
          }
        });

        // Hitung Posisi secara lokal (dari yang terlama ke terbaru)
        const matchedTxs = [...transactionsRes]
          .filter(t => t.status === 'MATCHED')
          .sort((a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime());
          
        const positionsMap = new Map<string, StockPosition>();

        for (const transaction of matchedTxs) {
          const current = positionsMap.get(transaction.ticker) ?? {
             ticker: transaction.ticker,
             netLots: 0,
             buyLots: 0,
             sellLots: 0,
             avgBuyPrice: 0,
             realizedSellValue: 0,
             lastTradeAt: null
          };

          if (transaction.side === 'BUY') {
            const currentCost = current.avgBuyPrice * current.netLots;
            const incomingCost = transaction.pricePerShare * transaction.lot;
            const nextLots = current.netLots + transaction.lot;
            current.avgBuyPrice = nextLots > 0 ? (currentCost + incomingCost) / nextLots : 0;
            current.buyLots += transaction.lot;
            current.netLots = nextLots;
          } else {
            current.sellLots += transaction.lot;
            current.netLots -= transaction.lot;
            current.realizedSellValue += transaction.netValue;
          }

          current.lastTradeAt = transaction.tradedAt;
          positionsMap.set(transaction.ticker, current);
        }

        const positionsCalc = Array.from(positionsMap.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));

        setTransactions(transactionsRes);
        setNotifications(notificationsRes);
        setSummary(summaryCalc);
        setPositions(positionsCalc);
        setError(null);
      } catch (loadError: any) {
        if (!active) return;
        setError(loadError?.message || 'Gagal memuat dashboard saham dari Supabase');
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 lg:p-8 font-sans text-gray-900">
      <main className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Portofolio Saham</h1>
            <p className="text-sm text-gray-500 mt-1">Dicatat otomatis dari broker</p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Transaksi Match"
            value={summary ? formatNumber(summary.transactions) : '...'}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Total Nilai Beli"
            value={summary ? formatCurrency(summary.buyValue) : '...'}
            icon={Wallet}
            color="fuchsia"
          />
          <StatCard
            title="Total Nilai Jual"
            value={summary ? formatCurrency(summary.sellValue) : '...'}
            icon={Activity}
            color="orange"
          />
        </div>

        {/* Posisi Saham (Full Width) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Posisi Saham</h2>
              <p className="text-sm text-gray-500 mt-1">{positions.length} ticker tercatat aktif maupun tertutup</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto p-4">
            {positions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 pb-12 pt-16">
                <CandlestickChart className="w-12 h-12 text-gray-200" />
                <p className="text-sm font-medium">Belum ada posisi.</p>
                <p className="text-xs mt-1">Sistem akan mencatat saat notifikasi MATCHED masuk.</p>
              </div>
            ) : (
              <div className="min-w-[800px] border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticker</th>
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status / Lot</th>
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Buy Price</th>
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Modal Beli</th>
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total Jual</th>
                      <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {positions.map((pos) => {
                      const isClosed = pos.netLots === 0;
                      return (
                        <tr key={pos.ticker} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                <span className="font-bold text-blue-700 text-sm">{pos.ticker.substring(0,2)}</span>
                              </div>
                              <span className="font-bold text-gray-900 text-base">{pos.ticker}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {isClosed ? (
                               <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wide">Closed</span>
                            ) : (
                               <span className="font-bold text-gray-900 bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-lg">Net {formatNumber(pos.netLots)} Lot</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-600">{formatCurrency(pos.avgBuyPrice)}</td>
                          <td className="py-4 px-6 text-right font-bold text-fuchsia-600">
                            {formatCurrency(pos.avgBuyPrice * pos.netLots * 100)}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-orange-600">
                            {formatCurrency(pos.realizedSellValue)}
                          </td>
                          <td className="py-4 px-6">
                            {pos.lastTradeAt && (
                              <div className="flex items-center text-xs font-medium text-gray-500 gap-1.5">
                                <Clock className="w-4 h-4" />
                                {formatCompactDate(pos.lastTradeAt)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
              <p className="text-xs text-gray-500 mt-1">{transactions.length} pesanan MATCHED</p>
            </div>
          </div>
          
          <div className="overflow-x-auto p-4">
            <div className="min-w-[800px] border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    <th className="p-4 pl-6 whitespace-nowrap">Waktu Transaksi</th>
                    <th className="p-4">Ticker</th>
                    <th className="p-4">Action</th>
                    <th className="p-4 text-right">Lot</th>
                    <th className="p-4 text-right">Harga</th>
                    <th className="p-4 text-right hidden md:table-cell">Gross</th>
                    <th className="p-4 text-right hidden md:table-cell">Fee Broker</th>
                    <th className="p-4 pr-6 text-right">Nilai Akhir (Net)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 pl-6 font-medium text-gray-500 whitespace-nowrap">{formatDate(tx.tradedAt)}</td>
                        <td className="p-4 font-bold text-gray-900">{tx.ticker}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold tracking-wide ${
                            tx.side === 'BUY' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                          }`}>
                            {tx.side}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">{formatNumber(tx.lot)}</td>
                        <td className="p-4 text-right font-medium text-gray-600">{formatNumber(tx.pricePerShare)}</td>
                        <td className="p-4 text-right text-gray-500 hidden md:table-cell">{formatCurrency(tx.grossValue)}</td>
                        <td className="p-4 text-right text-gray-500 hidden md:table-cell">{formatCurrency(tx.brokerFee)}</td>
                        <td className="p-4 pr-6 text-right font-black text-gray-900">{formatCurrency(tx.netValue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400 font-medium">
                         Belum ada transkasi MATCHED yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
