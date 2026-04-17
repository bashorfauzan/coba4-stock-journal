import axios from 'axios';

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl;
  }

  return '/api';
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

export type StockNotification = {
  id: string;
  sourceApp: string;
  senderName: string | null;
  title: string | null;
  messageText: string;
  receivedAt: string;
  status: 'MATCHED' | 'OPEN' | 'IGNORED' | 'FAILED';
  ticker: string | null;
  side: 'BUY' | 'SELL' | null;
  pricePerShare: number | null;
  lot: number | null;
  confidenceScore: number | null;
  parseNotes: string | null;
  transaction?: StockTransaction | null;
};

export type StockTransaction = {
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
};

export type StockPosition = {
  ticker: string;
  netLots: number;
  buyLots: number;
  sellLots: number;
  avgBuyPrice: number;
  realizedSellValue: number;
  realizedProfit: number;
  lastTradeAt: string | null;
};

export type StockSummary = {
  notifications: number;
  transactions: number;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  realizedProfit: number;
};
