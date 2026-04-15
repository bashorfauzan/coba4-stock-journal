import express from 'express';

import { db } from '../lib/db.js';

const router = express.Router();

type StockTransactionRow = {
  id: string;
  notificationId: string;
  sourceApp: string;
  title: string;
  ticker: string;
  side: 'BUY' | 'SELL';
  lot: number;
  pricePerShare: number;
  grossValue: number;
  brokerFee: number;
  netValue: number;
  tradedAt: string;
  status: 'MATCHED' | 'OPEN' | 'IGNORED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
};

router.get('/transactions', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT *
      FROM StockTransaction
      ORDER BY datetime(tradedAt) DESC
    `);

    const transactions = stmt.all() as StockTransactionRow[];
    res.json(transactions);
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({ error: 'Gagal mengambil transaksi saham' });
  }
});

router.get('/positions', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT *
      FROM StockTransaction
      WHERE status = 'MATCHED'
      ORDER BY ticker ASC, datetime(tradedAt) ASC
    `);

    const transactions = stmt.all() as StockTransactionRow[];
    const positions = new Map<string, {
      ticker: string;
      netLots: number;
      buyLots: number;
      sellLots: number;
      avgBuyPrice: number;
      realizedSellValue: number;
      lastTradeAt: string | null;
    }>();

    for (const transaction of transactions) {
      const current = positions.get(transaction.ticker) ?? {
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
      positions.set(transaction.ticker, current);
    }

    res.json(Array.from(positions.values()).sort((a, b) => a.ticker.localeCompare(b.ticker)));
  } catch (error) {
    console.error('Get stock positions error:', error);
    res.status(500).json({ error: 'Gagal menghitung posisi saham' });
  }
});

router.get('/summary', (_req, res) => {
  try {
    const notificationsRow = db.prepare('SELECT COUNT(*) as count FROM StockNotification').get() as { count: number };
    const transactions = db.prepare(`
      SELECT side, netValue
      FROM StockTransaction
      WHERE status = 'MATCHED'
    `).all() as Array<{ side: 'BUY' | 'SELL'; netValue: number }>;

    const summary = transactions.reduce(
      (acc, item) => {
        if (item.side === 'BUY') {
          acc.buyValue += item.netValue;
          acc.buyCount += 1;
        } else {
          acc.sellValue += item.netValue;
          acc.sellCount += 1;
        }
        return acc;
      },
      {
        notifications: notificationsRow.count,
        transactions: transactions.length,
        buyCount: 0,
        sellCount: 0,
        buyValue: 0,
        sellValue: 0
      }
    );

    res.json(summary);
  } catch (error) {
    console.error('Get stock summary error:', error);
    res.status(500).json({ error: 'Gagal mengambil ringkasan saham' });
  }
});

export default router;
