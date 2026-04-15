# Troubleshooting

## 1. App Sudah Install Tapi Tidak Muncul

Periksa:

- `Settings > Apps > Coba4 Stock Journal`
- app drawer / pencarian aplikasi
- launcher tidak menyembunyikan app baru

Solusi:

1. uninstall app
2. install ulang APK terbaru
3. restart launcher atau restart HP

## 2. Link Web Di HP Tidak Bisa Dibuka

Contoh:

- `http://192.168.0.109:5173`
- `http://192.168.0.109:5001/api/health`

Periksa:

1. HP dan laptop harus di Wi‑Fi yang sama
2. matikan data seluler saat tes
3. backend harus berjalan di port `5001`
4. frontend harus berjalan di port `5173`
5. jaringan guest / AP isolation harus nonaktif

## 3. Notifikasi Tidak Masuk

Periksa:

1. `Notification Access` sudah aktif
2. filter keyword tidak terlalu ketat
3. broker benar-benar mengeluarkan notifikasi
4. URL webhook benar

## 4. APK Menimpa App Lama

Build terbaru sudah memakai:

- app name: `Coba4 Stock Journal`
- applicationId: `com.coba4.stockjournal`

Jika masih terlihat seperti app lama, kemungkinan yang terpasang di HP masih APK lama.

## 5. Android Studio Gagal Build

Periksa:

1. SDK Android sudah terpasang
2. `local.properties` mengarah ke SDK yang benar
3. Gradle sync selesai tanpa error

Jika error menyebut `JAVA_HOME`, versi Java `21.0.x`, atau Gradle tidak cocok dengan JDK sistem:

1. gunakan `Embedded JDK` di Android Studio
2. atau pakai JDK `17` / JDK `21`
3. hindari campuran Java sistem dengan Java lain yang masih tersimpan di `JAVA_HOME`
4. jalankan `./gradlew --stop` lalu coba sync atau build ulang
5. cek `./gradlew -version` untuk melihat JVM yang benar-benar dipakai Gradle

Catatan untuk project ini:

- source code Android dikompilasi dengan Java `17`
- Gradle daemon toolchain disiapkan untuk Java `21`
- JDK `17` dan `21` aman, tetapi `Embedded JDK` Android Studio paling direkomendasikan

## 6. Parser Broker Belum Cocok

Jika ada notifikasi yang tidak terbaca:

1. salin teks notifikasi asli
2. kirim contoh title + body
3. tambahkan pola regex baru di backend
