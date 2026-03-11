# NekoPaw 🐾 - Platform Media Sosial

<p align="center">
  <img src="assets/Logo/StarMar-.png" alt="Logo NekoPaw" width="220"/>
</p>

<p align="center">
  <a href="https://github.com/faizinuha/StarMar2/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/faizinuha/StarMar2?color=blue&style=for-the-badge" alt="License">
  </a>
  <a href="https://github.com/faizinuha/StarMar2/issues">
    <img src="https://img.shields.io/github/issues/faizinuha/StarMar2?color=yellow&style=for-the-badge" alt="Issues">
  </a>
  <a href="https://github.com/faizinuha/StarMar2/network/members">
    <img src="https://img.shields.io/github/forks/faizinuha/StarMar2?color=orange&style=for-the-badge" alt="Forks">
  </a>
  <a href="https://github.com/faizinuha/StarMar2/stargazers">
    <img src="https://img.shields.io/github/stars/faizinuha/StarMar2?color=red&style=for-the-badge" alt="Stars">
  </a>
  <a href="https://github.com/faizinuha/StarMar2/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/faizinuha/StarMar2?color=brightgreen&style=for-the-badge" alt="Contributors">
  </a>
</p>

NekoPaw adalah aplikasi media sosial modern dan kaya fitur yang dirancang untuk menghubungkan orang dan membangun komunitas. Ini memungkinkan pengguna untuk berbagi postingan, cerita, meme, dan melakukan live streaming, serta berinteraksi dengan teman dan menjelajahi konten yang sedang tren.

**Demo Langsung:** [https://starmar2.vercel.app](https://starmar2.vercel.app)

## Fitur

### 🔐 Autentikasi
- Autentikasi pengguna yang aman dengan email/kata sandi
- Penyedia OAuth: Google dan GitHub
- Two-Factor Authentication (2FA) dengan Google Authenticator

### 📝 Navigasi Create (Dropdown Menu)
Tombol **Create** di navigasi menampilkan dropdown menu dengan 4 pilihan:
- **Post** → Membuat postingan baru (gambar, video, teks)
- **Meme** → Membuat dan berbagi meme
- **Story** → Upload cerita sementara (foto/video)
- **Live** → Memulai siaran langsung (WebRTC P2P)

### 📰 Postingan
- Buat, baca, perbarui, dan hapus postingan
- Dukungan multi-media (hingga 10 gambar/video per postingan)
- Like, komentar, dan repost
- Efek filter pada gambar
- Tag pengguna dan lokasi
- Hashtag otomatis

### 📖 Cerita (Stories)
- Bagikan cerita sementara dengan pengikut
- Dukungan foto dan video
- Efek filter dan caption
- Lokasi pada cerita

### 😂 Meme
- Bagian khusus untuk berbagi dan menelusuri meme
- Sistem badge untuk meme
- Like dan komentar pada meme

### 🎬 Live Streaming (WebRTC P2P)
Fitur live streaming sederhana menggunakan teknologi Peer-to-Peer:
- **Genre/Kategori**: Pilih kategori live (Gaming, Music, Art, Education, Technology, dll.)
- **Share Screen**: Bagikan layar Anda selama siaran
- **Auto-end**: Jika host keluar/meninggalkan halaman, live otomatis berakhir
- **Notifikasi**: Followers menerima notifikasi saat seseorang memulai live
- **Pemberitahuan penonton**: Penonton mendapat notifikasi saat host mengakhiri live
- **Tanggal & Waktu**: Tampilan tanggal dan waktu mulai live
- **Live Chat**: Obrolan real-time selama siaran
- **Catatan**: Terbaik untuk 5-10 penonton (P2P), live tidak bisa dihapus (hanya ditandai selesai)

### 👁️ View Count (Jumlah Tayangan)
Sistem pelacakan jumlah tayangan bekerja pada **semua jenis postingan**:
- ✅ Postingan gambar
- ✅ Postingan video
- ✅ Postingan teks
- Menggunakan `IntersectionObserver` untuk melacak saat postingan masuk viewport
- Format angka yang mudah dibaca (misalnya "1.2K", "3.5M")

### 👤 Profil Pengguna
- Gambar profil, bio, dan nama tampilan
- Cover image
- Tautan media sosial (Discord, Spotify, dll.)
- Statistik: postingan, pengikut, mengikuti

### ✅ Request Verification (Verifikasi Akun)
- Halaman pengajuan verifikasi akun di Settings
- Form dengan alasan verifikasi
- Status tracking (Menunggu, Disetujui, Ditolak)
- **Catatan**: Fitur verifikasi masih dalam tahap pengembangan. Belum ada fitur khusus setelah diverifikasi.

### 🔔 Notifikasi
- Notifikasi untuk like, komentar, pengikut baru
- Notifikasi live streaming dari pengguna yang diikuti
- Notifikasi sistem

### 💬 Pesan Langsung
- Chat pribadi dan grup
- Lampiran file
- Reply pesan
- Favorit percakapan

### 🔍 Explore & Pencarian
- Temukan konten baru dan trending
- Cari pengguna dan postingan
- Trending hashtag

### 📌 Bookmark
- Simpan postingan untuk dilihat nanti
- Organisasi dengan folder bookmark

### 🛡️ Admin Dashboard
- Manajemen pengguna (ban, verifikasi, edit)
- Moderasi konten dan laporan
- Ban appeals
- System health monitoring
- Maintenance mode

### 🎨 Tema & Tampilan
- Mode Gelap / Terang / Sistem
- Desain Baby Blue Pastel dengan tema Kawaii Cat
- Multi-bahasa (Indonesia, English, dll.)

## Teknologi yang Digunakan

### Frontend
- [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack React Query](https://tanstack.com/query)

### Backend & Database
- [Supabase](https://supabase.io/) — Autentikasi, Database PostgreSQL, Storage, Edge Functions, Realtime

### Live Streaming
- WebRTC (Peer-to-Peer)
- Supabase Realtime Channels (Signaling)

### Deployment
- [Vercel](https://vercel.com/)
- [Capacitor](https://capacitorjs.com/) (Android)

## Memulai

### Prasyarat
- Node.js dan npm (atau yarn/pnpm/bun)
- Akun Supabase

### Instalasi

1. **Kloning repositori:**
   ```sh
   git clone <URL_GIT_ANDA>
   cd star-snap-social
   ```

2. **Instal dependensi:**
   ```sh
   npm install
   ```

3. **Siapkan variabel lingkungan:**
   Buat file `.env` di root proyek:
   ```env
   VITE_SUPABASE_URL=URL_SUPABASE_ANDA
   VITE_SUPABASE_ANON_KEY=KUNCI_ANON_SUPABASE_ANDA
   VITE_SITE_URL=http://localhost:5173
   ```

4. **Konfigurasi Supabase:**
   - Aktifkan penyedia autentikasi Google dan GitHub
   - Tambahkan URL pengalihan:
     - `http://localhost:5173/auth/callback`
     - `https://url-produksi-anda.com/auth/callback`

5. **Jalankan server pengembangan:**
   ```sh
   npm run dev
   ```

## Struktur Database

### Tabel Utama
| Tabel | Deskripsi |
|-------|-----------|
| `profiles` | Profil pengguna |
| `posts` | Postingan (dengan `views_count`) |
| `post_media` | Media postingan (multi-file) |
| `stories` | Cerita sementara |
| `memes` | Konten meme |
| `comments` | Komentar pada postingan/meme |
| `likes` | Like pada postingan/meme/komentar |
| `followers` | Relasi pengikut |
| `live_streams` | Sesi live streaming (dengan `genre`) |
| `notifications` | Notifikasi pengguna |
| `conversations` | Percakapan chat |
| `messages` | Pesan chat |
| `bookmarks` | Bookmark postingan |
| `bookmark_folders` | Folder bookmark |
| `hashtags` | Hashtag trending |
| `verification_requests` | Pengajuan verifikasi akun |
| `post_views` | Tracking view per pengguna |
| `user_roles` | Role pengguna (admin, moderator, user) |

## Deployment

Proyek ini di-deploy di [Vercel](https://vercel.com/). Hubungkan repositori GitHub Anda ke Vercel dan konfigurasi variabel lingkungan.

## Berkontribusi

Kontribusi sangat dihargai! Silakan fork repo dan buat pull request.

1. Fork Proyek
2. Buat Cabang Fitur (`git checkout -b feature/FiturBaru`)
3. Commit Perubahan (`git commit -m 'Tambahkan FiturBaru'`)
4. Push ke Cabang (`git push origin feature/FiturBaru`)
5. Buka Pull Request
