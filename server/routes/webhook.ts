import crypto from 'crypto';
import express from 'express';

import { db } from '../lib/db.js';

const router = express.Router();

type NotificationStatus = 'MATCHED' | 'OPEN' | 'IGNORED' | 'FAILED';
type StockSide = 'BUY' | 'SELL';

type ParsedStockNotification = {
  status: NotificationStatus;
  title: string;
  ticker: string | null;
  side: StockSide | null;
  pricePerShare: number | null;
  lot: number | null;
  confidenceScore: number;
  notes: string | null;
};

type StockNotificationRow = {
  id: string;
  sourceApp: string;
  senderName: string | null;
  title: string | null;
  messageText: string;
  receivedAt: string;
  status: NotificationStatus;
  ticker: string | null;
  side: StockSide | null;
  pricePerShare: number | null;
  lot: number | null;
  confidenceScore: number | null;
  parseNotes: string | null;
  rawPayload: string | null;
  createdAt: string;
  updatedAt: string;
};

type StockTransactionRow = {
  id: string;
  notificationId: string;
  sourceApp: string;
  title: string;
  ticker: string;
  side: StockSide;
  lot: number;
  pricePerShare: number;
  grossValue: number;
  brokerFee: number;
  netValue: number;
  tradedAt: string;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
};

const BROKER_KEYWORDS = [
  'ajaib',
  'stockbit',
  'ipot',
  'rhb',
  'phillip',
  'philip',
  'poems',
  'semesta',
  'semesta sekuritas',
  'siminvest',
  'mandiri sekuritas',
  'mirae',
  'bcas',
  'sinarmas',
  'bions',
  'most',
  'motiontrade',
  'indopremier',
  'cgs',
  'trima',
  'valbury',
  'kresna',
  'trade'
];

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();
const toUpperNoSpace = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const toUpperWords = (value: string) => normalizeText(value).toUpperCase();

const pickFirst = <T>(...values: Array<T | null | undefined>) =>
  values.find((value) => value !== null && value !== undefined) ?? null;

const extractField = (text: string, label: string) => {
  const regex = new RegExp(
    `${label}\\s*[:=-]\\s*(.+?)(?=\\s+(?:stock|code|ticker|side|type|qty|lot|lots|price|avg\\s*price|average\\s*price)\\s*[:=-]|$)`,
    'i'
  );
  return text.match(regex)?.[1]?.trim() ?? null;
};

const parseNumeric = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const detectTitleStatus = (combined: string): NotificationStatus => {
  const lower = combined.toLowerCase();
  if (
    lower.includes('order matched')
    || lower.includes('matched')
    || lower.includes('done')
    || lower.includes('trade confirmation')
    || lower.includes('confirmation')
    || lower.includes('executed')
    || lower.includes('filled')
  ) {
    return 'MATCHED';
  }
  if (lower.includes('order open') || lower.includes('open') || lower.includes('pending')) {
    return 'OPEN';
  }
  return 'FAILED';
};

const extractTicker = (combined: string) => {
  const candidates = [
    extractField(combined, 'Stock'),
    extractField(combined, 'Code'),
    extractField(combined, 'Ticker'),
    combined.match(/\b(?:stock|ticker|code)\s*[:=-]?\s*([A-Z]{4,5})\b/i)?.[1],
    combined.match(/\b(?:buy|sell)\s+([A-Z]{4,5})\b/i)?.[1],
    combined.match(/\b([A-Z]{4,5})\s+(?:buy|sell)\b/i)?.[1],
    combined.match(/\b([A-Z]{4,5})\b(?=.*\b(?:lot|lots)\b)/i)?.[1]
  ];

  const raw = pickFirst(...candidates);
  return raw ? toUpperNoSpace(raw).match(/[A-Z]{4,5}/)?.[0] ?? null : null;
};

const extractSide = (combined: string): StockSide | null => {
  const raw = pickFirst(
    extractField(combined, 'Side'),
    extractField(combined, 'Type'),
    combined.match(/\bside\s*[:=-]?\s*(buy|sell)\b/i)?.[1],
    combined.match(/\b(buy|sell)\b/i)?.[1],
    combined.match(/\b(b|s)\b(?=.*\blot\b)/i)?.[1]
  );

  if (!raw) return null;
  const upper = toUpperWords(raw);
  if (upper === 'BUY' || upper === 'B') return 'BUY';
  if (upper === 'SELL' || upper === 'S') return 'SELL';
  return null;
};

const extractLot = (combined: string) => {
  const raw = pickFirst(
    extractField(combined, 'Lot'),
    extractField(combined, 'Lots'),
    extractField(combined, 'Qty'),
    combined.match(/\b(\d+(?:[.,]\d+)*)\s*(?:lot|lots)\b/i)?.[1],
    combined.match(/\b(?:lot|lots|qty)\s*[:=-]?\s*(\d+(?:[.,]\d+)*)\b/i)?.[1],
    combined.match(/\bqty\s+(\d+(?:[.,]\d+)*)\b/i)?.[1]
  );

  const parsed = parseNumeric(raw);
  return parsed ? Math.trunc(parsed) : null;
};

const extractPrice = (combined: string) => {
  const raw = pickFirst(
    extractField(combined, 'Price'),
    extractField(combined, 'Avg Price'),
    extractField(combined, 'Average Price'),
    combined.match(/@\s*([\d.,]+)/)?.[1],
    combined.match(/\b\d+(?:[.,]\d+)*\s*(?:lot|lots)\s+([\d.,]+)\b/i)?.[1],
    combined.match(/\bprice\s*[:=-]?\s*rp?\s*([\d.,]+)/i)?.[1],
    combined.match(/\bavg(?:\.|\s)?price\s*[:=-]?\s*rp?\s*([\d.,]+)/i)?.[1]
  );

  return parseNumeric(raw);
};

const parseNotification = (appName: string, title: string, text: string): ParsedStockNotification => {
  const cleanedTitle = normalizeText(title);
  const cleanedText = text.trim();
  const combined = `${cleanedTitle}\n${cleanedText}`.trim();
  const detectedStatus = detectTitleStatus(combined);
  const ticker = extractTicker(combined);
  const side = extractSide(combined);
  const pricePerShare = extractPrice(combined);
  const lot = extractLot(combined);

  const sourceLooksLikeBroker = BROKER_KEYWORDS.some((keyword) =>
    `${appName} ${cleanedTitle} ${cleanedText}`.toLowerCase().includes(keyword)
  );

  if (!sourceLooksLikeBroker && !ticker && !side && !pricePerShare && !lot) {
    return {
      status: 'IGNORED',
      title: cleanedTitle || 'Tanpa Judul',
      ticker: null,
      side: null,
      pricePerShare: null,
      lot: null,
      confidenceScore: 0.05,
      notes: 'Notifikasi tidak terlihat seperti notifikasi broker saham'
    };
  }

  if (!ticker || !side || !pricePerShare || !lot) {
    return {
      status: 'FAILED',
      title: cleanedTitle || 'Tanpa Judul',
      ticker,
      side,
      pricePerShare,
      lot,
      confidenceScore: sourceLooksLikeBroker ? 0.55 : 0.42,
      notes: sourceLooksLikeBroker
        ? 'Broker terdeteksi, tetapi field saham belum lengkap. Parser bisa ditambah jika Anda kirim contoh notifikasinya'
        : 'Field saham belum lengkap. Pastikan format memuat Stock, Side, Price, dan Lot'
    };
  }

  return {
    status: detectedStatus,
    title: cleanedTitle || (detectedStatus === 'MATCHED' ? 'Order Matched' : 'Order Open'),
    ticker,
    side,
    pricePerShare,
    lot,
    confidenceScore: detectedStatus === 'MATCHED' ? 0.96 : detectedStatus === 'OPEN' ? 0.82 : 0.68,
    notes:
      detectedStatus === 'MATCHED'
        ? 'Order cocok dan siap dicatat sebagai transaksi'
        : detectedStatus === 'OPEN'
          ? 'Order masih terbuka, disimpan ke inbox tanpa transaksi'
          : 'Status order tidak dikenali'
  };
};

router.get('/notifications', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
        n.*,
        t.id as transactionId,
        t.notificationId as transactionNotificationId,
        t.sourceApp as transactionSourceApp,
        t.title as transactionTitle,
        t.ticker as transactionTicker,
        t.side as transactionSide,
        t.lot as transactionLot,
        t.pricePerShare as transactionPricePerShare,
        t.grossValue as transactionGrossValue,
        t.brokerFee as transactionBrokerFee,
        t.netValue as transactionNetValue,
        t.tradedAt as transactionTradedAt,
        t.status as transactionStatus,
        t.createdAt as transactionCreatedAt,
        t.updatedAt as transactionUpdatedAt
      FROM StockNotification n
      LEFT JOIN StockTransaction t
        ON t.notificationId = n.id
      ORDER BY datetime(n.receivedAt) DESC
      LIMIT 100
    `);

    const rows = stmt.all() as Array<Record<string, unknown>>;
    const notifications = rows.map((row) => ({
      id: row.id,
      sourceApp: row.sourceApp,
      senderName: row.senderName,
      title: row.title,
      messageText: row.messageText,
      receivedAt: row.receivedAt,
      status: row.status,
      ticker: row.ticker,
      side: row.side,
      pricePerShare: row.pricePerShare,
      lot: row.lot,
      confidenceScore: row.confidenceScore,
      parseNotes: row.parseNotes,
      rawPayload: row.rawPayload,
      transaction: row.transactionId ? {
        id: row.transactionId,
        notificationId: row.transactionNotificationId,
        sourceApp: row.transactionSourceApp,
        title: row.transactionTitle,
        ticker: row.transactionTicker,
        side: row.transactionSide,
        lot: row.transactionLot,
        pricePerShare: row.transactionPricePerShare,
        grossValue: row.transactionGrossValue,
        brokerFee: row.transactionBrokerFee,
        netValue: row.transactionNetValue,
        tradedAt: row.transactionTradedAt,
        status: row.transactionStatus,
        createdAt: row.transactionCreatedAt,
        updatedAt: row.transactionUpdatedAt
      } : null
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Get stock notifications error:', error);
    res.status(500).json({ error: 'Gagal mengambil inbox notifikasi saham' });
  }
});

router.post('/notification', (req, res) => {
  try {
    const { appName, title, senderName, text, receivedAt, rawPayload } = req.body;

    if (!appName || !text) {
      return res.status(400).json({ error: 'appName dan text wajib diisi' });
    }

    const parsed = parseNotification(
      String(appName),
      String(title || senderName || ''),
      String(text)
    );

    if (parsed.status !== 'MATCHED') {
      return res.status(200).json({
        success: true,
        createdTransaction: false,
        reason: parsed.status === 'OPEN' 
          ? 'Mengabaikan order OPEN, hanya mencatat MATCHED'
          : (parsed.notes || 'Hanya mencatat order MATCHED'),
        parsed
      });
    }

    if (parsed.ticker && parsed.side && parsed.pricePerShare && parsed.lot) {
      const duplicateStmt = db.prepare(`
        SELECT id
        FROM StockNotification
        WHERE sourceApp = ?
          AND ticker = ?
          AND side = ?
          AND pricePerShare = ?
          AND lot = ?
          AND datetime(receivedAt) >= datetime('now', '-5 minutes')
        LIMIT 1
      `);

      const duplicate = duplicateStmt.get(
        String(appName),
        parsed.ticker,
        parsed.side,
        parsed.pricePerShare,
        parsed.lot
      ) as { id: string } | undefined;

      if (duplicate) {
        return res.status(200).json({
          success: true,
          createdTransaction: false,
          isDuplicate: true,
          duplicateOfId: duplicate.id,
          parsed
        });
      }
    }

    const nowIso = new Date().toISOString();
    const notificationId = crypto.randomUUID();
    const notification: StockNotificationRow = {
      id: notificationId,
      sourceApp: String(appName),
      senderName: senderName ? String(senderName) : null,
      title: parsed.title,
      messageText: String(text),
      receivedAt: receivedAt ? new Date(receivedAt).toISOString() : nowIso,
      status: parsed.status,
      ticker: parsed.ticker,
      side: parsed.side,
      pricePerShare: parsed.pricePerShare,
      lot: parsed.lot ? Math.trunc(parsed.lot) : null,
      confidenceScore: parsed.confidenceScore,
      parseNotes: parsed.notes,
      rawPayload: JSON.stringify(rawPayload ?? req.body),
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const insertNotification = db.prepare(`
      INSERT INTO StockNotification (
        id, sourceApp, senderName, title, messageText, receivedAt, status, ticker, side,
        pricePerShare, lot, confidenceScore, parseNotes, rawPayload, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotification.run(
      notification.id,
      notification.sourceApp,
      notification.senderName,
      notification.title,
      notification.messageText,
      notification.receivedAt,
      notification.status,
      notification.ticker,
      notification.side,
      notification.pricePerShare,
      notification.lot,
      notification.confidenceScore,
      notification.parseNotes,
      notification.rawPayload,
      notification.createdAt,
      notification.updatedAt
    );

    if (parsed.status !== 'MATCHED' || !parsed.ticker || !parsed.side || !parsed.pricePerShare || !parsed.lot) {
      return res.status(202).json({
        success: true,
        createdTransaction: false,
        notification,
        reason: parsed.notes
      });
    }

    const grossValue = parsed.pricePerShare * parsed.lot * 100;
    const feeRate = parsed.side === 'BUY' ? 0.0015 : 0.0025;
    const brokerFee = Number((grossValue * feeRate).toFixed(2));
    const netValue = Number(
      (parsed.side === 'BUY' ? grossValue + brokerFee : grossValue - brokerFee).toFixed(2)
    );

    const transaction: StockTransactionRow = {
      id: crypto.randomUUID(),
      notificationId: notification.id,
      sourceApp: notification.sourceApp,
      title: parsed.title,
      ticker: parsed.ticker,
      side: parsed.side,
      lot: Math.trunc(parsed.lot),
      pricePerShare: parsed.pricePerShare,
      grossValue,
      brokerFee,
      netValue,
      tradedAt: notification.receivedAt,
      status: parsed.status,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const insertTransaction = db.prepare(`
      INSERT INTO StockTransaction (
        id, notificationId, sourceApp, title, ticker, side, lot, pricePerShare,
        grossValue, brokerFee, netValue, tradedAt, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTransaction.run(
      transaction.id,
      transaction.notificationId,
      transaction.sourceApp,
      transaction.title,
      transaction.ticker,
      transaction.side,
      transaction.lot,
      transaction.pricePerShare,
      transaction.grossValue,
      transaction.brokerFee,
      transaction.netValue,
      transaction.tradedAt,
      transaction.status,
      transaction.createdAt,
      transaction.updatedAt
    );

    res.status(201).json({
      success: true,
      createdTransaction: true,
      notification,
      transaction
    });
  } catch (error: any) {
    console.error('Stock webhook error:', error);
    res.status(500).json({
      error: 'Gagal memproses notifikasi saham',
      details: String(error?.message || error)
    });
  }
});

export default router;
