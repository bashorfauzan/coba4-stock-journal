# Coba4 Android Broker Helper

Android helper ini menangkap notifikasi broker saham dari perangkat Android, lalu mengirimkannya ke backend `coba4`. Wrapper WebView tetap dipertahankan supaya dashboard web bisa dibuka dari app yang sama.

Dokumen yang paling berguna jika Anda memakai Android Studio:

- `README.md`: ringkasan proyek Android helper
- `ANDROID_STUDIO_GUIDE.md`: panduan buka project, build, install APK, dan lokasi file output
- `INSTALL_HP.md`: langkah install APK ke HP
- `TROUBLESHOOTING.md`: solusi masalah umum
- `CHANGELOG.md`: riwayat perubahan penting
- `BROKER_FORMATS.md`: kumpulan contoh format notifikasi broker

## Yang sudah ada

- `NotificationListenerService`
- form untuk menyimpan URL endpoint backend
- form untuk menyimpan URL web app utama
- form untuk menyimpan filter keyword
- status pengiriman terakhir di layar setup
- kirim payload ke `POST /api/stock-webhook/notification`
- wrapper WebView untuk membuka dashboard utama

## Struktur penting

- `app/src/main/java/com/coba4/stockjournal/MainActivity.kt`
- `app/src/main/java/com/coba4/stockjournal/service/AccountNotificationListenerService.kt`
- `app/src/main/java/com/coba4/stockjournal/service/WebhookSender.kt`
- `app/build/outputs/apk/debug/app-debug.apk`

## Cara jalankan

1. Buka folder `android-helper` di Android Studio.
2. Pilih `Embedded JDK` pada pengaturan Gradle Android Studio jika ada konflik Java.
3. Jalankan app ke emulator atau HP Android.
4. Isi endpoint backend.
5. Isi URL web app utama.
6. Atur filter keyword.
7. Simpan pengaturan.
8. Buka `Notification Access` dan aktifkan `Coba4 Notifikasi Saham`.
9. Uji notifikasi broker.

Contoh endpoint:

- emulator: `http://10.0.2.2:5001/api/stock-webhook/notification`
- HP fisik: `http://192.168.1.10:5001/api/stock-webhook/notification`

Contoh URL web app:

- emulator: `http://10.0.2.2:5173`
- HP fisik: `http://192.168.1.10:5173`

Contoh filter:

- `rhb,stockbit,ajaib,ipot,matched,open,buy,sell,stock,lot`
- `trade,order matched,order open`

## Payload yang dikirim

```json
{
  "appName": "RHB",
  "title": "Order Matched",
  "senderName": "",
  "text": "Stock : ESIP\nSide : Sell\nPrice : 104\nLot : 1",
  "receivedAt": "2026-03-20T09:30:00.000Z",
  "rawPayload": {
    "packageName": "com.rhb.trade.smart",
    "notificationKey": "...",
    "postTime": 1774000000000,
    "androidTitle": "Order Matched"
  }
}
```

## Catatan

- `localhost` di HP tidak menunjuk ke laptop Anda.
- Untuk HP fisik, backend Express harus bind ke jaringan lokal.
- Beberapa broker mungkin memotong isi notifikasi di Android tertentu.
- Jika format broker berbeda, parser backend bisa ditambah regex baru.
- Jika build Android error karena Java, gunakan JDK `17` atau `21`. Opsi paling aman adalah `Embedded JDK` dari Android Studio.
