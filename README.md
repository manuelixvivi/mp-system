# MP Control System v1.0

> **Platform Pusat Kendali Otomatisasi Komunikasi Komunitas MP melalui LINE Bot & Web Dashboard**  
> *One Control Center. Multiple Automations. One Integrated Communication System.*

---

## 🌟 Ikhtisar Produk (Product Overview)

MP Control System merupakan sistem terpadu untuk mengotomatisasi, mengaudit, dan memantau komunikasi komunitas MP melalui dua modul utama:

1. **Daily Devotional Automation ("Coffee Break with God")**
   - Mengambil renungan harian dari **The Katolik** pada pukul **00:00 WIB**.
   - Menyusun renungan ke template resmi menggunakan **LLM Gemini**.
   - Jendela audit bagi **Tim Liturgi** dari pukul **00:00 – 09:45 WIB**.
   - Siaran otomatis pada pukul **09:45 WIB** ke seluruh grup LINE yang ditugaskan.
   - Kebijakan fallback: Jika belum diaudit pukul 09:45 WIB, sistem mengirim otomatis **hanya jika lolos validasi** dan tidak pernah di-reject atau diminta revisi.

2. **Birthday Automation**
   - Dikelola oleh **Tim Logistik**.
   - Berjalan setiap hari secara otomatis pada pukul **07:00 WIB** (tanpa memerlukan persetujuan manual).
   - Penggabungan ucapan: Jika terdapat lebih dari 1 anggota yang berulang tahun di hari dan grup yang sama, seluruh anggota digabungkan dalam satu ucapan (`happy birthday @A, @B and @C !`).
   - Menggunakan **LINE native mention** asli (`textV2` substitutions).
   - **Tanpa boneka atau emotikon 🧸**.
   - Aturan pembatasan mention API LINE (maksimal 20 mention/pesan): jika penerima > 20 orang, pesan pertama menggunakan template ucapan lengkap (kutipan Lamentations 3:22-23), dan pesan kedua serta seterusnya menggunakan format singkat.

3. **Dua Jalur Pengendalian Bot (Dual-Channel Control)**
   - **Dashboard Web MP Control System** (dengan switcher role Superadmin, Liturgi, Logistik).
   - **Personal Chat 1-on-1 dengan LINE Bot** (`/menu`, `/status`, `/help`, `/broadcast`, `/approve`, `/reject`).
   - **Perilaku Bot di Grup:** Bot bersifat **broadcast-only** di grup LINE. Bot tidak merespons obrolan umum, tidak menjawab pesan anggota, dan tidak menjalankan command di grup.

---

## 👥 Matriks Hak Akses (Role-Based Access Control)

| Fitur / Modul | Superadmin | Liturgi | Logistik |
| :--- | :---: | :---: | :---: |
| Overview Dashboard | ✅ | ✅ | ✅ |
| Manajemen Konten Renungan | ✅ | ✅ | ❌ |
| Audit & Revisi Renungan (00:00–09:45) | ✅ | ✅ | ❌ |
| Manual Broadcast Renungan | ✅ | ✅ | ❌ |
| Data Anggota & Ulang Tahun | ✅ | ❌ | ✅ |
| Kalender Ulang Tahun & Preview Mention | ✅ | ❌ | ✅ |
| Manual Broadcast Ulang Tahun | ✅ | ❌ | ✅ |
| LINE Bot Configuration | ✅ | ❌ | ❌ |
| LINE Group Management | ✅ | ❌ | ❌ |
| Jadwal & Pengaturan Otomatisasi | ✅ | ❌ | ❌ |
| User Management & Penautan LINE ID | ✅ | ❌ | ❌ |
| Broadcast Delivery History | ✅ | ✅ | ✅ |
| Activity Logs & JSON Audit | ✅ | ❌ | ❌ |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions & API Routes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Database**: PostgreSQL (Supabase) + Built-in Local Persistence Engine (`mp_database.json`)
- **Scraper**: Cheerio HTTP Parser (The Katolik)
- **AI / LLM**: Google Gemini API (`@google/genai`)
- **Messaging API**: LINE Messaging API (`textV2` mentions, push & reply)
- **Scheduler**: Backend Cron API Endpoints (`/api/cron/*`) dengan Idempotency Keys

---

## 🚀 Panduan Memulai Cepat (Getting Started)

### 1. Prasyarat
- Node.js versi 18+ atau 24+
- npm atau pnpm

### 2. Instalasi & Menjalankan Development Server
```bash
# Masuk ke direktori projek
cd mp-control-system

# Jalankan server Next.js
npm run dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000). Aplikasi akan langsung mengarah ke `/dashboard`.

---

## ⚙️ Variabel Lingkungan (.env)

Buat file `.env.local` berdasarkan file `.env.example`:

```env
# Server & Timezone
NODE_ENV=development
PORT=3000
TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LINE Messaging API Credentials
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Supabase PostgreSQL (Produksi)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Secret untuk Mengamankan Endpoint Cron
CRON_SECRET=mp_control_system_cron_secret_2026
```

---

## 🗄️ Database Setup (Supabase)

Skrip SQL lengkap untuk Supabase PostgreSQL tersedia di:
- `supabase/schema.sql` — Tabel lengkap, constraint, foreign key, index, dan RLS.
- `supabase/seed.sql` — Data awal (Superadmin, Liturgi, Logistik, Grup LINE, Devotional hari ini, Anggota dan Ulang Tahun).

Cukup buka SQL Editor di dashboard Supabase Anda, salin isi `supabase/schema.sql` lalu jalankan.

---

## 🤖 Perintah Personal Chat LINE Bot (Command-Based)

Pengguna yang telah menautkan akun LINE di dashboard dapat berinteraksi 1-on-1 dengan bot:

| Perintah | Akses Role | Keterangan |
| :--- | :--- | :--- |
| `/menu` | Semua Role | Menampilkan menu opsi sesuai role |
| `/status` | Semua Role | Memeriksa status otomatisasi hari ini |
| `/help` | Semua Role | Panduan perintah |
| `/approve` | Liturgi, Superadmin | Menyetujui renungan harian untuk disiarkan pukul 09:45 WIB |
| `/reject` | Liturgi, Superadmin | Menolak renungan harian (membatalkan siaran) |
| `/broadcast devotional` | Liturgi, Superadmin | Membuka alur siaran manual renungan |
| `/broadcast birthday` | Logistik, Superadmin | Membuka alur siaran manual ucapan ultah |
| `/confirm` | Role Pengirim | Mengonfirmasi eksekusi siaran |
| `/batal` | Role Pengirim | Membatalkan siaran yang menunggu |

> 🔒 *Akun yang tidak terdaftar akan otomatis ditolak oleh sistem dan dicatat pada Activity Logs.*

---

## 🧪 Pengujian Fitur di Dashboard

1. **User Management & RBAC:** Buka `/dashboard/users` (khusus Superadmin) untuk mendaftarkan akun baru dengan token aktivasi sekali pakai atau mengubah password.
2. **Audit Studio:** Buka `/dashboard/devotionals/audit` untuk memeriksa perbandingan sumber artikel The Katolik vs LLM Coffee Break with God template, mengedit, dan mengubah status audit.
3. **Manual Broadcast Studio:** Buka `/dashboard/broadcast/manual` untuk menguji alur siaran manual dengan proteksi konfirmasi dan pencegahan double-submission.
4. **Cron Test Runner:** Buka `/dashboard/settings/automation` untuk menguji endpoint cron tanpa menunggu jadwal jam sesungguhnya.

---

## 📜 Lisensi & Pemeliharaan

Dikembangkan untuk **MP Community** sesuai dokumen spesifikasi **MP Control System PRD v1.0 Final**.
