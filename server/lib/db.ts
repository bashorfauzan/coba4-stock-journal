import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const resolveDbFile = () => {
  const rawUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  if (!rawUrl.startsWith('file:')) {
    return path.resolve(process.cwd(), 'prisma/dev.db');
  }

  const value = rawUrl.slice(5);
  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(process.cwd(), value);
};

const dbFile = resolveDbFile();
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new DatabaseSync(dbFile);

export const initDb = () => {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS StockNotification (
      id TEXT PRIMARY KEY,
      sourceApp TEXT NOT NULL,
      senderName TEXT,
      title TEXT,
      messageText TEXT NOT NULL,
      receivedAt TEXT NOT NULL,
      status TEXT NOT NULL,
      ticker TEXT,
      side TEXT,
      pricePerShare REAL,
      lot INTEGER,
      confidenceScore REAL,
      parseNotes TEXT,
      rawPayload TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS StockTransaction (
      id TEXT PRIMARY KEY,
      notificationId TEXT NOT NULL UNIQUE,
      sourceApp TEXT NOT NULL,
      title TEXT NOT NULL,
      ticker TEXT NOT NULL,
      side TEXT NOT NULL,
      lot INTEGER NOT NULL,
      pricePerShare REAL NOT NULL,
      grossValue REAL NOT NULL,
      brokerFee REAL NOT NULL,
      netValue REAL NOT NULL,
      tradedAt TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (notificationId) REFERENCES StockNotification(id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stock_notification_received_status
      ON StockNotification(receivedAt, status);
    CREATE INDEX IF NOT EXISTS idx_stock_notification_ticker_received
      ON StockNotification(ticker, receivedAt);
    CREATE INDEX IF NOT EXISTS idx_stock_transaction_ticker_traded
      ON StockTransaction(ticker, tradedAt);
  `);
};
