# RuangUji
Klien ujian berbahasa Indonesia untuk web dan Android. Halaman peserta, konfigurasi pengawas, dan riwayat menggunakan HTML, CSS dan JavaScript yang sama. Aplikasi Android menggunakan Java dan Android WebView. Tidak memerlukan layanan basis data untuk mode lokal.

## Coba di komputer / Antigravity
Ekstrak seluruh ZIP, buka folder RuangUji sebagai proyek dan jalankan perintah berikut dari terminal di folder tersebut.

    python -m http.server 8080 --directory dist

Buka http://localhost:8080 lalu pilih **Coba simulasi**. Jawab lima soal, akhiri sesi dan periksa skor di Riwayat. Navigasi antarsoal mempertahankan pilihan. Muat ulang halaman untuk melanjutkan sesi di peramban yang sama. Gunakan HTTPS ketika diakses dari perangkat lain. Kamera, enkripsi dan fitur lain memerlukan konteks aman.

## Siapkan ujian sekolah
1. Di Konfigurasi, isi Identitas sekolah, kemudian pilih Buat konfigurasi. Isi judul, alamat HTTPS, durasi, kelas dan tanggal agenda. Tanggal adalah informasi agenda; LMS mengatur jadwal akses resmi.
2. Jika membutuhkan pemeriksaan token di klien, masukkan minimal enam karakter. Saat mengubah konfigurasi, token kosong mempertahankan token sebelumnya. Untuk menghapus token, buat konfigurasi baru. Gunakan autentikasi dan batas waktu LMS untuk ujian resmi.
3. Klik Kode QR untuk mencetak kartu ukuran F4 (210 × 330 mm) atau menyimpan PDF melalui dialog cetak. QR membawa konfigurasi dalam bentuk yang dapat dibaca. Jangan memasukkan kredensial dalam URL. Ekspor .cbt memakai AES-GCM 256-bit dan PBKDF2 SHA-256. Sampaikan kata sandi file melalui saluran terpisah. Format .cbt khusus RuangUji.
4. Peserta memindai QR, mengimpor file atau memasukkan URL. URL langsung memakai durasi yang dimasukkan peserta. QR dan file mempertahankan pengaturan pengawas. Uji dahulu login, media dan pengiriman jawaban LMS pada perangkat peserta. Situs harus mengizinkan iframe, termasuk melalui kebijakan CSP dan X-Frame-Options. Login melalui popup dan cookie pihak ketiga dapat dibatasi peramban.
5. Pada ujian tautan, peserta mengirim jawaban di LMS, kemudian memilih Akhiri sesi. Saat timer habis, RuangUji menutup tampilan ujian. Jawaban pada iframe mengikuti mekanisme simpan LMS. Untuk simulasi, aplikasi menghitung skor secara lokal.

## Android
Buka folder android di Android Studio dengan JDK 17, Android SDK Platform 35 dan Gradle 8.9. Sinkronkan proyek, atau jalankan dari akar proyek dengan Gradle 8.9 terpasang:

    gradle -p android assembleDebug

APK uji ada di android/app/build/outputs/apk/debug/app-debug.apk. Pasang pada Android 8.0+ dengan WebView terkini. Android mengambil aset dari dist/ saat build. Simulasi bawaan dapat dijalankan tanpa jaringan di APK. Tautan LMS memerlukan akses ke server sekolah. Pemindai QR Android meminta izin kamera. Mode semat layar memerlukan persetujuan sesuai kebijakan perangkat. Gunakan Android Studio Generate Signed Bundle / APK dan simpan kunci rilis secara privat untuk distribusi resmi.

## GitHub
Buat repositori kosong, lalu jalankan dari folder proyek:

    git init -b main
    git add .
    git commit -m "Versi awal RuangUji"
    git remote add origin https://github.com/AKUN/REPOSITORI.git
    git push -u origin main

Ganti AKUN dan REPOSITORI. Sertakan folder tersembunyi .github agar workflow ikut tersimpan. Setelah push, buka Actions → Build APK Android → pilih proses yang berhasil → unduh RuangUji-APK-debug di Artifacts. Untuk versi web, pilih Settings → Pages → Source → GitHub Actions lalu jalankan workflow Publikasikan web ke GitHub Pages secara manual. Atur akses situs sesuai kebijakan sekolah, dan bagikan QR dari URL yang dapat diakses siswa.

## Berkas utama
- dist/index.html dan dist/style.css — struktur, warna, dan tata letak.
- dist/app.js — beranda, pengaturan, kamera web, sesi ujian dan riwayat.
- dist/core.js — validasi konfigurasi, contoh soal, token dan enkripsi.
- android/app/src/main/java/id/ruanguji/cbt/MainActivity.java — pemindai, pemilih file, cetak dan semat layar.
- tests — pengujian logika. Jalankan npm test dengan Node.js 22+.
- dist/qr.js — encoder QR lokal karya Kazuhiko Arase, lisensi MIT, lihat THIRD-PARTY.txt.

## Batas penggunaan
Penyimpanan konfigurasi, identitas, sesi, penghitung perubahan visibilitas, dan riwayat berlaku pada perangkat serta profil peramban terkait. Gunakan satu tab per peserta. Penghapusan data aplikasi menghapus riwayat. Panel konfigurasi lokal dapat dibuka oleh pengguna perangkat. Aplikasi ini belum menyediakan akun pengawas, rekap lintas perangkat, atau penilaian terpusat. Gunakan LMS sekolah untuk kebutuhan tersebut. Kehilangan fokus dapat dipicu notifikasi atau sistem, sehingga catatan perlu ditinjau pengawas. Pada Android, perlindungan tangkapan layar diaktifkan saat sesi melalui FLAG_SECURE. Penyematan layar pada perangkat pribadi dapat dilepas pengguna. Mode kios terkelola memerlukan kebijakan perangkat sekolah. Pada peramban tanpa BarcodeDetector gunakan kamera ponsel untuk QR web atau impor .cbt.
