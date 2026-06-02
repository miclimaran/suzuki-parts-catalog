# 🔧 Suzuki Parts Catalog

Aplikasi web internal untuk pencarian dan manajemen katalog sparepart Suzuki.

## Fitur

- 🔍 **Pencarian instan** — cari berdasarkan part number atau nama barang
- ➕ **Tambah part baru** dengan validasi duplikat otomatis
- ✏️ **Edit & hapus** data part
- ⬇ **Export ke Excel/CSV** — bisa dibuka langsung di Microsoft Excel
- 📱 **Responsive** — bisa dipakai di HP maupun laptop
- 💾 **Data tersimpan otomatis** di browser (localStorage)

## Cara Pakai

1. Buka file `index.html` di browser (Chrome / Firefox / Edge)
2. Data contoh sudah tersedia saat pertama buka
3. Tambah part baru dengan klik tombol **"+ Tambah Part"**
4. Cari part dengan mengetik di kolom pencarian
5. Export data ke Excel dengan klik **"⬇ Export Excel"**

## Shortcut Keyboard

| Shortcut | Fungsi |
|---|---|
| `Ctrl + K` | Fokus ke kolom pencarian |
| `Esc` | Tutup modal |

## Struktur File

```
suzuki-parts/
├── index.html   → Struktur halaman
├── style.css    → Tampilan / desain
├── app.js       → Logika aplikasi
└── README.md    → Dokumentasi ini
```

## Catatan

- Data disimpan di **browser lokal** (localStorage). Jika ingin data dipakai bersama oleh banyak komputer, pertimbangkan upgrade ke versi dengan database server.
- File export berformat **CSV** yang kompatibel dengan Microsoft Excel (termasuk karakter Indonesia/Unicode).

---

© Suzuki Parts Internal Tool
