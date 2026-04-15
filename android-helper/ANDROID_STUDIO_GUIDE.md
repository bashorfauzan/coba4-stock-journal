# Android Studio Guide

Dokumen ini diletakkan langsung di folder `android-helper` supaya mudah dibuka dari Android Studio.

## Buka Project

1. Buka Android Studio.
2. Pilih `Open`.
3. Arahkan ke folder:
   `/Users/bashorfauzan/Documents/coba4/android-helper`
4. Tunggu Gradle sync selesai.

## JDK Yang Disarankan

Project ini memakai:

- Android Gradle Plugin `9.1.0`
- `compileSdk = 35`
- source dan target Java `17`
- Gradle daemon toolchain `21`

Supaya build stabil, gunakan salah satu:

- JDK `17`
- JDK `21`
- `Embedded JDK` dari Android Studio

Pilihan paling aman adalah `Embedded JDK` karena biasanya paling cocok dengan kombinasi Android Studio + Gradle yang sedang aktif.

### Set JDK di Android Studio

1. Buka `Android Studio > Settings` atau `Preferences` di macOS.
2. Masuk ke `Build, Execution, Deployment > Build Tools > Gradle`.
3. Pada `Gradle JDK`, pilih `Embedded JDK`.
4. Lakukan `Sync Project with Gradle Files`.

### Jika Sebelumnya Pernah Ganti Java

Kadang error tetap muncul karena daemon Gradle lama masih aktif atau `JAVA_HOME` masih menunjuk ke versi Java lain.

Jalankan dari terminal di folder `android-helper`:

```bash
./gradlew --stop
./gradlew -version
```

Pastikan hasil `./gradlew -version` tidak lagi menunjukkan JDK yang bentrok.

Jika Anda build dari terminal macOS dan ingin memakai JDK 21:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew :app:assembleDebug
```

Jika ingin memakai JDK 17:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./gradlew :app:assembleDebug
```

## Identitas App

- Nama app: `Coba4 Stock Journal`
- Package / applicationId: `com.coba4.stockjournal`

App ini sudah dibuat terpisah, jadi tidak lagi menimpa aplikasi NOVA.

## Jalankan Ke HP

1. Sambungkan HP Android atau buka emulator.
2. Di Android Studio tekan `Run`.
3. Setelah app terbuka:
   - isi URL backend webhook
   - isi URL web app
   - simpan pengaturan
   - aktifkan `Notification Access`

## Build APK Dari Android Studio

1. Pilih menu `Build`
2. Pilih `Build Bundle(s) / APK(s)`
3. Pilih `Build APK(s)`

Atau lewat terminal di folder ini:

```bash
./gradlew :app:assembleDebug
```

## Lokasi APK

File APK debug ada di:

`/Users/bashorfauzan/Documents/coba4/android-helper/app/build/outputs/apk/debug/app-debug.apk`

## Endpoint Default

- Emulator Android:
  `http://10.0.2.2:5001/api/stock-webhook/notification`
- HP fisik:
  `http://192.168.0.109:5001/api/stock-webhook/notification`

## URL Web Default

- Emulator Android:
  `http://10.0.2.2:5173`
- HP fisik:
  `http://192.168.0.109:5173`

## Jika App Tidak Muncul Di HP

1. Cari `Coba4 Stock Journal` di app drawer.
2. Cek `Settings > Apps`.
3. Kalau sebelumnya sudah install build lama, uninstall lalu install ulang APK terbaru.
4. Pastikan launcher HP tidak menyembunyikan app baru.

## Jika Link Dari HP Tidak Bisa Dibuka

1. Pastikan HP dan laptop berada di Wi-Fi yang sama.
2. Matikan data seluler saat tes.
3. Pastikan backend berjalan di port `5001`.
4. Pastikan frontend web berjalan di port `5173`.
