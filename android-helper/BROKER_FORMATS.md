# Broker Formats

Dokumen ini dipakai untuk mengumpulkan contoh format notifikasi dari berbagai sekuritas.

Tujuannya:

- mempermudah penyesuaian parser backend
- mencatat pola notifikasi per broker
- memisahkan format `matched`, `open`, `rejected`, dan format lain

## Cara Mengisi

Untuk setiap broker, catat:

1. nama broker
2. judul notifikasi
3. isi notifikasi
4. hasil yang diharapkan:
   - ticker
   - side
   - lot
   - price
   - status

## Template

```text
Broker:
Title:
Text:

Expected:
- ticker:
- side:
- lot:
- price:
- status:
```

## Contoh Yang Sudah Diketahui

### RHB

```text
Broker: RHB
Title: Order Matched
Text:
Stock : ESIP
Side  : Sell
Price : 104
Lot   : 1

Expected:
- ticker: ESIP
- side: SELL
- lot: 1
- price: 104
- status: MATCHED
```

### Stockbit

```text
Broker: Stockbit
Title: Matched
Text:
BUY BBCA 2 lot @ 9100

Expected:
- ticker: BBCA
- side: BUY
- lot: 2
- price: 9100
- status: MATCHED
```

### Phillip / POEMS

```text
Broker: Phillip
Title: Order Matched
Text:
BBRI SELL 3 LOT 4200

Expected:
- ticker: BBRI
- side: SELL
- lot: 3
- price: 4200
- status: MATCHED
```

### Semesta Sekuritas

```text
Broker: Semesta Sekuritas
Title: Trade Confirmation
Text:
Code: TLKM Side: Buy Qty: 5 Avg Price: 2710

Expected:
- ticker: TLKM
- side: BUY
- lot: 5
- price: 2710
- status: MATCHED
```

## Broker Yang Perlu Dikumpulkan Contohnya

- Stockbit
- Phillip / POEMS
- Semesta Sekuritas
- IPOT
- Ajaib
- Mirae
- BCAS
- BIONS
- MOST / Mandiri Sekuritas
- Sinarmas / SimInvest

## Catatan

- gunakan teks notifikasi asli sebisa mungkin
- hapus data sensitif bila ada
- kalau satu broker punya beberapa format, tulis semuanya
