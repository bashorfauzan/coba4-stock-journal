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
      <main className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        
        {/* Header Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-blue-600 mb-1 uppercase tracking-wider">Coba4 Stock Journal</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Portfolio Saham</h1>
            <p className="text-gray-600 mt-2 max-w-2xl text-sm lg:text-base">
              Pantau aset investasi, sejarah pencatatan posisi saham, serta riwayat beli & jual yang masuk secara otomatis.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          <StatCard
            title="Transaksi Match"
            value={summary ? formatNumber(summary.transactions) : '...'}
            icon={CheckCircle2}
            iconBg="bg-emerald-500"
          />
          <StatCard
            title="Total Nilai Beli"
            value={summary ? formatCurrency(summary.buyValue) : '...'}
            icon={Wallet}
            iconBg="bg-purple-500"
          />
          <StatCard
            title="Total Nilai Jual"
            value={summary ? formatCurrency(summary.sellValue) : '...'}
            icon={Activity}
            iconBg="bg-orange-500"
          />
        </div>

        <div className="w-full">
          
          {/* Posisi Saham */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Posisi Portofolio Anda</h2>
                <p className="text-xs text-gray-500 mt-1">{positions.length} emiten tercatat dalam kepemilikan Anda</p>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {positions.length > 0 ? (
                  positions.map((position) => (
                    <div key={position.ticker} className="bg-white border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100/50 shadow-sm">
                            <span className="font-bold text-blue-700 text-lg">{position.ticker.substring(0,2)}</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 text-lg tracking-tight">{position.ticker}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {formatCompactDate(position.lastTradeAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            position.netLots >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {formatNumber(position.netLots)} Lot
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50/80">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Beli / Jual</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatNumber(position.buyLots)} <span className="text-gray-300 font-light">/</span> {formatNumber(position.sellLots)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Avg. Price</p>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(position.avgBuyPrice)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                    <CandlestickChart className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-base font-semibold text-gray-700">Portofolio Anda Masih Kosong.</p>
                    <p className="text-sm mt-1 text-gray-500 max-w-sm">Transaksi saham yang tereksekusi akan otomatis membentuk portofolio Anda di sini.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Riwayat Transaksi</h2>
              <p className="text-xs text-gray-500 mt-1">{transactions.length} transaksi tercatat</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="p-4 whitespace-nowrap">Waktu</th>
                  <th className="p-4">Ticker</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4 text-right">Lot</th>
                  <th className="p-4 text-right">Harga</th>
                  <th className="p-4 text-right hidden md:table-cell">Gross</th>
                  <th className="p-4 text-right hidden md:table-cell">Fee</th>
                  <th className="p-4 text-right">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(tx.tradedAt)}</td>
                      <td className="p-4 font-bold text-gray-900">{tx.ticker}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold leading-none ${
                          tx.side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.side}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-900">{formatNumber(tx.lot)}</td>
                      <td className="p-4 text-right font-medium text-gray-900">{formatNumber(tx.pricePerShare)}</td>
                      <td className="p-4 text-right text-gray-500 hidden md:table-cell">{formatCurrency(tx.grossValue)}</td>
                      <td className="p-4 text-right text-gray-500 hidden md:table-cell">{formatCurrency(tx.brokerFee)}</td>
                      <td className="p-4 text-right font-bold text-gray-900">{formatCurrency(tx.netValue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      Belum ada riwayat transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
