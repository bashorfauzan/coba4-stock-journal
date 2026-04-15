import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './lib/db.js';
import webhookRoutes from './routes/webhook.js';
import stockRoutes from './routes/stocks.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

initDb();

const getLocalIpv4Addresses = () => {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
};

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'coba4-stock-journal',
    now: new Date().toISOString()
  });
});

app.use('/api/stock-webhook', webhookRoutes);
app.use('/api/stocks', stockRoutes);

app.use(express.static(clientDistPath));

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Stock Journal API berjalan di http://localhost:${port}`);
  for (const address of getLocalIpv4Addresses()) {
    console.log(`Akses dari HP lokal: http://${address}:${port}`);
  }
});
