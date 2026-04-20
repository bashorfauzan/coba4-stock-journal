import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function expects a default export
export default async function handler(req: any, res: any) {
  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Inisialisasi Supabase menggunakan Environment Variable dari Vercel
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing on Vercel Serverless');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Early return logic dihapus agar semua notifikasi tetap tersimpan di database 
    // untuk keperluan debugging, kita bisa lihat kalau ada parser yang gagal.

    // Cek Duplikat di Supabase (direvisi menjadi 15 detik untuk menghindari blokir pada Partial Matched beruntun)
    if (parsed.ticker && parsed.side && parsed.pricePerShare && parsed.lot) {
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
      const { data: duplicates } = await supabase
        .from('StockNotification')
        .select('id')
        .eq('sourceApp', String(appName))
        .eq('ticker', parsed.ticker)
        .eq('side', parsed.side)
        .eq('pricePerShare', parsed.pricePerShare)
        .eq('lot', parsed.lot)
        .gte('receivedAt', fifteenSecondsAgo)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        return res.status(200).json({
          success: true,
          createdTransaction: false,
          isDuplicate: true,
          duplicateOfId: duplicates[0].id,
          parsed
        });
      }
    }

    // Insert Notification
    const nowIso = new Date().toISOString();
    const notificationPayload = {
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
    };

    const { data: insertedNotif, error: notifError } = await supabase
      .from('StockNotification')
      .insert(notificationPayload)
      .select()
      .single();

    if (notifError || !insertedNotif) {
       throw new Error(`Gagal menyimpan notifikasi: ${notifError?.message}`);
    }

    if (parsed.status !== 'MATCHED' || !parsed.ticker || !parsed.side || !parsed.pricePerShare || !parsed.lot) {
      return res.status(202).json({
        success: true,
        createdTransaction: false,
        notification: insertedNotif,
        reason: parsed.notes
      });
    }

    // Insert Transaction
    const grossValue = parsed.pricePerShare * parsed.lot * 100;
    const feeRate = parsed.side === 'BUY' ? 0.0015 : 0.0025;
    const brokerFee = Number((grossValue * feeRate).toFixed(2));
    const netValue = Number(
      (parsed.side === 'BUY' ? grossValue + brokerFee : grossValue - brokerFee).toFixed(2)
    );

    const transactionPayload = {
      notificationId: insertedNotif.id,
      sourceApp: insertedNotif.sourceApp,
      title: parsed.title,
      ticker: parsed.ticker,
      side: parsed.side,
      lot: Math.trunc(parsed.lot),
      pricePerShare: parsed.pricePerShare,
      grossValue,
      brokerFee,
      netValue,
      tradedAt: insertedNotif.receivedAt,
      status: parsed.status
    };

    const { data: insertedTx, error: txError } = await supabase
      .from('StockTransaction')
      .insert(transactionPayload)
      .select()
      .single();

    if (txError) {
      throw new Error(`Gagal menyimpan transaksi: ${txError.message}`);
    }

    res.status(201).json({
      success: true,
      createdTransaction: true,
      notification: insertedNotif,
      transaction: insertedTx
    });
  } catch (error: any) {
    console.error('Stock webhook error:', error);
    res.status(500).json({
      error: 'Gagal memproses notifikasi saham',
      details: String(error?.message || error)
    });
  }
}

// === HELPER FUNCTIONS (Dicopy dari server lama) ===

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

const BROKER_KEYWORDS = [
  'ajaib', 'stockbit', 'ipot', 'rhb', 'phillip', 'philip', 'poems', 'semesta', 
  'semesta sekuritas', 'siminvest', 'mandiri sekuritas', 'mirae', 'bcas', 
  'sinarmas', 'bions', 'most', 'motiontrade', 'indopremier', 'cgs', 'trima', 
  'valbury', 'kresna', 'trade'
];

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();
const toUpperNoSpace = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const toUpperWords = (value: string) => normalizeText(value).toUpperCase();

const pickFirst = <T>(...values: Array<T | null | undefined>) =>
  values.find((value) => value !== null && value !== undefined) ?? null;

const extractField = (text: string, label: string) => {
  const regex = new RegExp(`${label}\\s*[:=-]\\s*(.+?)(?=\\s+(?:stock|code|ticker|side|type|qty|lot|lots|price|avg\\s*price|average\\s*price)\\s*[:=-]|$)`, 'i');
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
    lower.includes('order matched') || lower.includes('matched') || lower.includes('done') || 
    lower.includes('trade confirmation') || lower.includes('confirmation') || 
    lower.includes('executed') || lower.includes('filled') ||
    lower.includes('berhasil') || lower.includes('sukses') || lower.includes('selesai')
  ) {
    return 'MATCHED';
  }
  if (lower.includes('order open') || lower.includes('open') || lower.includes('pending') || lower.includes('antri')) { return 'OPEN'; }
  return 'FAILED';
};

const extractTicker = (combined: string) => {
  const candidates = [
    extractField(combined, 'Stock'), extractField(combined, 'Code'), extractField(combined, 'Ticker'),
    combined.match(/\b(?:stock|ticker|code)\s*[:=-]?\s*([A-Z]{4,5})\b/i)?.[1],
    combined.match(/\b(?:buy|sell|beli|jual)\s+([A-Z]{4,5})\b/i)?.[1],
    combined.match(/\b([A-Z]{4,5})\s+(?:buy|sell|beli|jual)\b/i)?.[1],
    combined.match(/\b([A-Z]{4,5})\b(?=.*\b(?:lot|lots)\b)/i)?.[1]
  ];
  const raw = pickFirst(...candidates);
  return raw ? toUpperNoSpace(raw).match(/[A-Z]{4,5}/)?.[0] ?? null : null;
};

const extractSide = (combined: string): StockSide | null => {
  const raw = pickFirst(
    extractField(combined, 'Side'), extractField(combined, 'Type'),
    combined.match(/\bside\s*[:=-]?\s*(buy|sell|beli|jual)\b/i)?.[1],
    combined.match(/\b(buy|sell|beli|jual)\b/i)?.[1], combined.match(/\b(b|s)\b(?=.*\blot\b)/i)?.[1]
  );
  if (!raw) return null;
  const upper = toUpperWords(raw);
  if (upper === 'BUY' || upper === 'B' || upper === 'BELI') return 'BUY';
  if (upper === 'SELL' || upper === 'S' || upper === 'JUAL') return 'SELL';
  return null;
};

const extractLot = (combined: string) => {
  const raw = pickFirst(
    extractField(combined, 'Lot'), extractField(combined, 'Lots'), extractField(combined, 'Qty'),
    combined.match(/\b(\d+(?:[.,]\d+)*)\s*(?:lot|lots)\b/i)?.[1],
    combined.match(/\b(?:lot|lots|qty)\s*[:=-]?\s*(\d+(?:[.,]\d+)*)\b/i)?.[1],
    combined.match(/\bqty\s+(\d+(?:[.,]\d+)*)\b/i)?.[1]
  );
  const parsed = parseNumeric(raw);
  return parsed ? Math.trunc(parsed) : null;
};

const extractPrice = (combined: string) => {
  const raw = pickFirst(
    extractField(combined, 'Price'), extractField(combined, 'Avg Price'), extractField(combined, 'Average Price'),
    combined.match(/@\s*([\d.,]+)/)?.[1], combined.match(/\b\d+(?:[.,]\d+)*\s*(?:lot|lots)\s+([\d.,]+)\b/i)?.[1],
    combined.match(/\bprice\s*[:=-]?\s*rp?\s*([\d.,]+)/i)?.[1], combined.match(/\bavg(?:\.|\s)?price\s*[:=-]?\s*rp?\s*([\d.,]+)/i)?.[1]
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
    return { status: 'IGNORED', title: cleanedTitle || 'Tanpa Judul', ticker: null, side: null, pricePerShare: null, lot: null, confidenceScore: 0.05, notes: 'Bukan notifikasi broker' };
  }

  if (!ticker || !side || !pricePerShare || !lot) {
    return { status: 'FAILED', title: cleanedTitle || 'Tanpa Judul', ticker, side, pricePerShare, lot, confidenceScore: 0.42, notes: 'Data parsial' };
  }

  return {
    status: detectedStatus, title: cleanedTitle || (detectedStatus === 'MATCHED' ? 'Order Matched' : 'Order Open'),
    ticker, side, pricePerShare, lot, confidenceScore: detectedStatus === 'MATCHED' ? 0.96 : 0.82,
    notes: 'Order lengkap'
  };
};
