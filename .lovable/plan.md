
## Fitur #4: Messages & Group Advanced

### 4a. End-to-End Encryption (E2EE)
- Buat tabel `user_keys` untuk menyimpan public key setiap user
- Generate keypair (RSA/ECDH) di client saat pertama kali login
- Enkripsi pesan di client sebelum dikirim ke server
- Dekripsi pesan di client setelah diterima
- Tampilkan badge 🔒 "End-to-End Encrypted" di chat

### 4b. Advanced Group Features
- **Group foto profile**: Sudah ada `avatar_url` di conversations, pastikan UI upload berfungsi
- **Admin di atas**: Urutkan member list dengan admin (created_by) di posisi teratas
- **Moderator grup**: Tambah tabel `group_roles` (admin/moderator/member) per conversation
- **Mode chat terbatas**: Hanya admin & moderator yang bisa kirim pesan (toggle setting)
- **Bagikan grup**: Generate invite link / share ke user lain

### Fitur #5: Video Call WebRTC P2P

### 5a. Database & Signaling
- Buat tabel `call_sessions` (caller, callee, status, type, conversation_id)
- Buat tabel `call_signals` untuk WebRTC signaling (offer/answer/ICE candidates)
- Edge function atau realtime channel untuk signaling

### 5b. Call UI & Logic
- **Incoming call UI**: Ring notification dengan accept/reject
- **Call screen**: Video display, mute/unmute, camera flip (depan/belakang)
- **Screen sharing**: Via `getDisplayMedia()`
- **Invite teman**: Tambah peserta ke panggilan aktif
- **Gelombang animasi**: Tampilkan wave animation saat menunggu jawaban
- **Tidak tampil jika tidak direspon**: Auto-cancel setelah timeout (30 detik)
- **Group call**: Support multi-peer connection untuk grup

### Urutan Implementasi:
1. ✅ Migration database (group_roles, call_sessions, call_signals, user_keys)
2. ✅ E2E Encryption logic + UI badge
3. ✅ Advanced group features (roles, restricted chat, share)
4. ✅ Video call system (signaling, UI, screen share, invite)

**Catatan**: E2E encryption menggunakan Web Crypto API (browser native). Video call menggunakan WebRTC API native tanpa library tambahan untuk menjaga ringan & minim memory leak.
