# Install Di HP

Panduan singkat untuk memasang `Coba4 Stock Journal` ke smartphone Android.

## File APK

Lokasi APK debug:

`/Users/bashorfauzan/Documents/coba4/android-helper/app/build/outputs/apk/debug/app-debug.apk`

## Cara Install

1. Pindahkan `app-debug.apk` ke HP.
2. Buka file APK dari File Manager.
3. Jika diminta, aktifkan izin `Install unknown apps`.
4. Lanjutkan proses install sampai selesai.

## Setelah Install

1. Cari app `Coba4 Stock Journal` di app drawer.
2. Buka app.
3. Isi URL backend webhook.
4. Isi URL web app.
5. Simpan pengaturan.
6. Aktifkan `Notification Access`.

## URL Yang Umum Dipakai

Jika backend dan web dijalankan dari laptop:

- Backend:
  `http://192.168.0.109:5001/api/stock-webhook/notification`
- Web:
  `http://192.168.0.109:5173`

## Jika App Tidak Muncul

1. Cek `Settings > Apps > Coba4 Stock Journal`.
2. Jika sudah terinstall, cari manual di app drawer.
3. Jika masih tidak muncul, uninstall lalu install ulang APK terbaru.

## Jika Install Gagal

Kemungkinan penyebab:

- masih ada build lama yang bentrok
- file APK lama yang terinstall
- izin install dari sumber tidak dikenal belum aktif
