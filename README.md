# Coba4 Stock Journal

Proyek ini adalah versi baru yang difokuskan untuk pencatatan saham:

- helper Android untuk membaca notifikasi broker
- backend Express + Prisma untuk menerima webhook dan menyimpan ke database
- frontend React untuk melihat inbox notifikasi, transaksi saham, dan posisi

Bagian yang dipindahkan dari `coba2`:

- pola `NotificationListenerService` Android
- pengiriman webhook dari HP ke backend
- pola endpoint backend untuk menerima notifikasi dan menyimpan ke database

Penyesuaian utama di `coba4`:

- parser diubah untuk notifikasi saham multi-broker
- database dibuat khusus untuk `StockNotification` dan `StockTransaction`
- frontend disederhanakan agar fokus ke jurnal saham

## Struktur

- `android-helper`: app Android penangkap notifikasi broker
- `server`: API + Prisma + SQLite
- `client`: dashboard web

## Menjalankan lokal

1. Install dependency root, server, dan client:
   - `npm install`
   - `cd server && npm install`
   - `cd ../client && npm install`
2. Siapkan konfigurasi backend:
   - `cd ../server`
   - `cp .env.example .env`
3. Jalankan app:
   - dari root `npm run dev`

## Menjalankan online seperti `coba2`

Mode production untuk `coba4` memakai satu domain yang sama:

- frontend dibuild ke `client/dist`
- backend Express menyajikan frontend tersebut
- request API frontend memakai path relatif `/api`

Perintah utamanya dari root:

- build: `npm run build`
- start production: `npm run start`

Jika dideploy ke platform seperti Railway, cukup arahkan service ke root project dan jalankan dua perintah di atas.

## Endpoint penting

- `POST /api/stock-webhook/notification`
- `GET /api/stock-webhook/notifications`
- `GET /api/stocks/transactions`
- `GET /api/stocks/positions`

## Broker yang ditargetkan saat ini

- Stockbit
- RHB
- IPOT
- Phillip / POEMS
- Semesta Sekuritas
- Ajaib
- BCAS
- BIONS
- Mirae

Parser dibuat fleksibel untuk format seperti:

- `Order Matched` lalu detail `Stock : BBCA / Side : Buy / Price : 9100 / Lot : 2`
- `BUY BBCA 2 lot @ 9,100`
- `BBCA SELL 1 LOT 9100`

## Catatan Android helper

Default endpoint di helper diarahkan ke:

- emulator: `http://10.0.2.2:5001/api/stock-webhook/notification`
- HP fisik: ganti ke IP laptop Anda, misalnya `http://192.168.1.10:5001/api/stock-webhook/notification`
