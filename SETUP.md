# Panduan Setup Supabase — Suzuki Parts Catalog

Ikuti langkah-langkah ini untuk mengaktifkan login, database cloud, dan fitur import.
Estimasi waktu: **15–20 menit**.

---

## Langkah 1 — Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) dan klik **Start your project**
2. Login dengan GitHub atau email
3. Klik **New Project**
   - Pilih organisasi (atau buat baru)
   - Isi nama project: misalnya `suzuki-parts`
   - Isi **Database Password** — simpan password ini!
   - Pilih region terdekat: **Southeast Asia (Singapore)**
4. Tunggu 1–2 menit sampai project selesai dibuat

---

## Langkah 2 — Jalankan SQL Setup

1. Di Supabase Dashboard, klik **SQL Editor** di sidebar kiri
2. Klik **New query**
3. Buka file `supabase-setup.sql` di folder ini
4. Copy semua isinya dan paste ke SQL Editor
5. Klik **Run** (atau tekan Ctrl+Enter)
6. Pastikan muncul pesan sukses (tidak ada error merah)

---

## Langkah 3 — Ambil API Keys

1. Di sidebar kiri, klik **Settings** → **API**
2. Catat dua nilai ini:
   - **Project URL** — contoh: `https://abcdefgh.supabase.co`
   - **anon public** key — string panjang dimulai dengan `eyJ...`

---

## Langkah 4 — Masukkan Keys ke app.js

1. Buka file `app.js` di text editor (Notepad, VS Code, dll)
2. Cari bagian paling atas:
   ```js
   const SUPABASE_URL  = 'GANTI_DENGAN_PROJECT_URL';
   const SUPABASE_KEY  = 'GANTI_DENGAN_ANON_PUBLIC_KEY';
   ```
3. Ganti kedua nilai tersebut dengan URL dan key Anda:
   ```js
   const SUPABASE_URL  = 'https://abcdefgh.supabase.co';
   const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```
4. Simpan file

---

## Langkah 5 — Buat Akun Admin Pertama

1. Di Supabase Dashboard, klik **Authentication** → **Users**
2. Klik **Invite user** (atau **Add user**)
3. Masukkan email dan password Anda
4. Klik **Create user**

Akun baru otomatis punya role **viewer**. Untuk jadikan admin:

5. Klik **Table Editor** di sidebar → pilih tabel **profiles**
6. Cari baris dengan email Anda
7. Klik nilai di kolom **role** → ubah dari `viewer` ke `admin`
8. Klik **Save**

---

## Langkah 6 — Buka Website

1. Buka file `index.html` di browser
2. Login dengan email dan password yang tadi dibuat
3. Anda sudah bisa menggunakan semua fitur!

---

## Tambah Akun Viewer / Admin Lain

- Buka Supabase Dashboard → **Authentication** → **Users** → **Invite user**
- Masukkan email orang tersebut — mereka akan dapat email undangan
- Default role adalah **viewer** (hanya bisa lihat)
- Untuk jadikan admin, ubah role di **Table Editor** → **profiles**
- Atau, login sebagai admin di website → klik avatar (pojok kanan atas) → **Kelola Akun** → ubah role langsung dari UI

---

## Format Import Excel / Google Sheets

Saat import data, format kolom harus seperti ini:

| Kolom A      | Kolom B              | Kolom C  | Kolom D  |
|--------------|----------------------|----------|----------|
| Part Number  | Deskripsi/Nama Barang| Kategori | Catatan  |
| 22100-52S00  | Dekrup Futura 2019   | Mesin    |          |

- Baris pertama bisa header (akan di-skip otomatis)
- Kolom C dan D opsional
- Format file: `.xlsx`, `.xls`, `.csv`

### Import dari Google Sheets:
1. Buka Google Sheets Anda
2. Klik **File → Share → Anyone with the link** → set ke **Viewer**
3. Copy link tersebut
4. Di website, klik **Import** → tab **Google Sheets** → paste link → **Muat Data**

---

## Ringkasan Level Akun

| Fitur              | Admin | Viewer |
|--------------------|-------|--------|
| Lihat katalog      | ✅    | ✅     |
| Cari & filter      | ✅    | ✅     |
| Export Excel/CSV   | ✅    | ✅     |
| Tambah part        | ✅    | ❌     |
| Edit part          | ✅    | ❌     |
| Hapus part         | ✅    | ❌     |
| Import Excel/Sheets| ✅    | ❌     |
| Kelola akun        | ✅    | ❌     |

---

## Butuh Bantuan?

Jika ada error atau pertanyaan, cek:
- Supabase Dashboard → **Logs** untuk melihat error detail
- Pastikan URL dan anon key di `app.js` sudah benar (tidak ada spasi ekstra)
- Pastikan SQL setup sudah dijalankan tanpa error
