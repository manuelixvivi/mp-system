# Panduan Deployment Vercel — MP Control System v1.0

Dokumen ini menjelaskan langkah demi langkah untuk mendeploy **MP Control System** ke [Vercel](https://vercel.com/) sebagai server-side & API runtime production.

---

## 1. Arsitektur Serverless Vercel & Supabase

Vercel menggunakan lingkungan komputasi **Serverless Node.js**.
- **State & Database**: Disimpan di **Supabase PostgreSQL** menggunakan skema resmi [`supabase/schema.sql`](./supabase/schema.sql).
- **Automasi Terjadwal**: Dijalankan otomatis melalui fitur bawaan **Vercel Cron Jobs** yang dikonfigurasikan di [`vercel.json`](./vercel.json).
- **Gateway Webhook**: Endpoint `/api/line/webhook` menangani *incoming webhook* dari LINE Messaging API secara instan (serverless edge/lambda).

---

## 2. Pemetaan Jadwal Cron Vercel (WIB ke UTC)

Vercel Cron berjalan menggunakan zona waktu **UTC**. Karena Waktu Indonesia Barat (**WIB**) adalah **UTC+7**, konfigurasi pada `vercel.json` telah disesuaikan secara presisi:

| Automasi | Jadwal WIB (Target) | Konversi UTC (Vercel) | Sintaks Cron (`vercel.json`) |
| :--- | :---: | :---: | :---: |
| **Devotional Scraping** (The Katolik + LLM) | **00:00 WIB** | **17:00 UTC** (H-1) | `0 17 * * *` |
| **Birthday Broadcast** (Mention Asli) | **07:00 WIB** | **00:00 UTC** | `0 0 * * *` |
| **Devotional Broadcast** (Approved / Fallback) | **09:45 WIB** | **02:45 UTC** | `45 2 * * *` |

Isi file `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/devotional-scrape",
      "schedule": "0 17 * * *"
    },
    {
      "path": "/api/cron/birthday-broadcast",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/devotional-broadcast",
      "schedule": "45 2 * * *"
    }
  ]
}
```

> 🔒 **Keamanan Cron:** Vercel secara otomatis menyertakan header `x-vercel-cron: 1` atau `Authorization: Bearer <CRON_SECRET>` saat memanggil endpoint cron ini, sehingga endpoint terlindungi dari eksekusi liar dari luar.

---

## 3. Langkah-Langkah Deployment ke Vercel

### Langkah 1: Siapkan Supabase Database
1. Buka [https://supabase.com](https://supabase.com) dan buat proyek baru.
2. Masuk ke menu **SQL Editor**.
3. Salin dan jalankan seluruh isi file [`supabase/schema.sql`](./supabase/schema.sql) untuk membuat 18 tabel, index, dan RLS.
4. Salin dan jalankan file [`supabase/seed.sql`](./supabase/seed.sql) untuk mengisi data awal (Profil Admin, Grup LINE, dan data renungan/anggota).
5. Buka menu **Project Settings > API** dan catat:
   - **Project URL**
   - **Project API Keys (`anon` & `service_role`)**

### Langkah 2: Hubungkan Repositori ke Vercel
1. Unggah kode projek ke GitHub/GitLab.
2. Buka dashboard [Vercel](https://vercel.com/) dan klik **Add New > Project**.
3. Pilih repositori `mp-control-system`.
4. Framework Preset akan otomatis terdeteksi sebagai **Next.js**.

### Langkah 3: Konfigurasi Environment Variables di Vercel
Sebelum menekan tombol *Deploy*, tambahkan variabel lingkungan berikut di bagian **Environment Variables**:

| Variable Key | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| `NODE_ENV` | Mode lingkungan | `production` |
| `TIMEZONE` | Zona waktu sistem | `Asia/Jakarta` |
| `NEXT_PUBLIC_APP_URL` | Domain Vercel produksi | `https://mp-control.vercel.app` |
| `LINE_CHANNEL_ID` | Channel ID dari LINE Developers | `2006123456` |
| `LINE_CHANNEL_SECRET` | Channel Secret LINE | `sec_xxxxxxxxxxxxxxxx` |
| `LINE_CHANNEL_ACCESS_TOKEN` | Long-lived Channel Access Token | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | API Key Google Gemini untuk LLM | `AIzaSy...` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Proyek Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key Supabase | `eyJhbGciOi...` |
| `CRON_SECRET` | Kunci proteksi endpoint cron | `mp_control_system_prod_secret_2026` |

### Langkah 4: Deploy Projek
1. Klik tombol **Deploy**.
2. Vercel akan menjalankan `next build` dan mengoptimasi seluruh halaman (Overview, Flight Progress Strip, Audit Studio, Chat Simulator, dan API routes).
3. Setelah selesai, Anda akan mendapatkan URL domain aktif (misal `https://mp-control.vercel.app`).

---

## 4. Konfigurasi LINE Developers Console

Setelah domain Vercel aktif:
1. Buka [LINE Developers Console](https://developers.line.biz/console/).
2. Pilih channel bot Anda dan masuk ke tab **Messaging API**.
3. Pada bagian **Webhook settings**:
   - **Webhook URL**: Masukkan `https://<domain-vercel-anda>/api/line/webhook` (contoh: `https://mp-control.vercel.app/api/line/webhook`).
   - Tekan tombol **Verify** (harus mengembalikan status `Success`).
   - Aktifkan toggle **Use webhook**.
4. Pada bagian **LINE Official Account features**:
   - **Auto-reply messages**: Pilih **Disabled** (agar bot tidak mengirim balasan default bawaan LINE).
   - **Greeting messages**: Pilih **Disabled** atau sesuaikan kebutuhan.
   - **Group and multi-person chats**: Pastikan **Allow bot to join group chats** dalam status **Enabled**.

---

## 5. Verifikasi Fitur Produksi di Vercel

1. **Uji Cron Vercel**:
   - Masuk ke dashboard Vercel proyek Anda, buka tab **Settings > Cron Jobs**.
   - Anda akan melihat 3 cron job aktif:
     - `devotional-scrape` (17:00 UTC / 00:00 WIB)
     - `birthday-broadcast` (00:00 UTC / 07:00 WIB)
     - `devotional-broadcast` (02:45 UTC / 09:45 WIB)
   - Anda dapat menekan tombol **Trigger** untuk menguji eksekusi manual secara instan.
2. **Uji Chat Bot LINE**:
   - Tambahkan bot sebagai teman di LINE.
   - Kirimkan perintah `/menu` atau `/status` dari chat personal 1-on-1.
   - Bot akan memvalidasi LINE User ID Anda dan membalas sesuai hak akses role.
3. **Uji Flight Progress Strip**:
   - Buka `/dashboard/birthdays` di domain produksi untuk memantau status antrean strip ulang tahun.
