# 🚀 SMART REPORT

Sistem custom web pengganti reporting visual SAP berbasis React, React Flow, AG Grid, FastAPI, Pandas, PostgreSQL, dan SAP MCP RFC Gateway.

> 📖 **Dokumentasi Lengkap:** Lihat [ARCHITECTURE_AND_FEATURES.md](ARCHITECTURE_AND_FEATURES.md) untuk panduan arsitektur sistem, pemisahan konteks modular, fitur multi-bahasa, dark mode, dan SOP penambahan fitur baru.

---

## 🛠️ TECH STACK & ARSITEKTUR

- **Frontend:** React.js, React Flow (`@xyflow/react`), AG Grid Community (`ag-grid-react`), Zustand, TailwindCSS, Lucide Icons.
- **Backend:** FastAPI (Asynchronous `async def`), Pandas (Diffing, Custom Formula, Anonymization, Deduplication), OpenPyXL, Cryptography (AES-Fernet), APScheduler (Task Scheduler).
- **Database:** PostgreSQL (`ABAP_DB`), Schema: `smart_report`.
- **Koneksi SAP:** HTTP MCP Gateway (`http://192.168.1.161:4000/v1/gateway`) dengan dynamic credential headers (`X-SAP-User`, `X-SAP-Password`, `X-SAP-Client`).
- **AI Engine:** Local Ollama (`qwen2.5:3b` pada `http://localhost:11434`) dengan fallback OpenAI API.

---

## 🎯 FITUR UTAMA & IMPLEMENTASI RULES

### 1. Visual Query Canvas (React Flow)
- Node tabel interaktif menampilkan header tabel, status key (`◆`), data type (`CHAR`, `DATS`, `CURR`, dsb.), dan checkbox pemilihan kolom output.
- **Auto-Join (Rule 2):** Saat tabel ditarik ke kanvas, sistem otomatis mengecek relasi Foreign Key dari Kamus Data SAP (`DD08L` / `sap_metadata_sync`) dan Primary Key matching, lalu menarik garis (Edge) secara otomatis.
- **Join Editor:** Klik garis relasi untuk mengganti tipe join (`INNER JOIN` vs `LEFT OUTER JOIN`).

### 2. Next-Gen ALV Grid (AG Grid)
- **Virtual Scrolling:** Performa tinggi untuk ratusan hingga ribuan baris data transaksi SAP.
- **Drag & Drop Column Reordering (Rule 2):** Kolom dapat digeser posisinya secara bebas.
- **Custom Column Formula (+ fx):** Menambahkan kolom kalkulasi dinamis langsung di grid (contoh: `row.MENGE * row.NETPR` atau `row.NETPR * 0.11`).
- **Multi-Level Filtering & Sorting:** Fitur sorting multi-kolom dan Excel-like filter.

### 3. Variant Manager (Save/Load Layout)
- Menyimpan konfigurasi urutan kolom, kolom tersembunyi, parameter filter, dan formula dinamis ke tabel `smart_report.report_variants`.
- Memungkinkan beralih antar layout dengan satu klik persis seperti fitur Save Layout di SAP GUI.

### 4. Cross-Server Data Compare
- Membandingkan data antara 2 server SAP (misal DEV vs QA vs PRD vs Sandbox).
- **Rule 1 Compliance:** Pemanggilan data kedua server SAP dijalankan secara paralel non-blocking menggunakan `asyncio.gather`.
- **Rule 1 Compliance:** Komparasi baris dan pencarian delta kolom dijalankan dalam memori menggunakan pustaka **Pandas**.
- Visual Diffing Grid menampilkan badge warna:
  - 🟢 **ADDED_IN_B:** Baris baru di Server B.
  - 🔴 **DELETED_IN_B:** Baris hilang di Server B.
  - 🟡 **MODIFIED:** Kolom mengalami perubahan nilai (lama → baru).
  - ⚪ **IDENTICAL:** Seluruh nilai kolom identik.

### 5. Smart Export & Anonymization
- **Rule 4 Compliance:** Modul `pandas_engine.py` otomatis berjalan sebelum export Excel untuk menyamarkan (*masking*) nominal data vendor sensitif (`BANKN`, `IBAN`, `WRBTR`, `NETPR`, `TAX`) menjadi format terlindungi.
- **Deduplikasi Baris:** Menghapus baris transaksi ganda (misal invoice berulang) dengan Pandas.
- File Excel (.xlsx) diformat rapi dengan tema SAP Blue ALV, zebra striping, dan auto-fit column width.

### 6. AI Chat Assistant (Natural Language to Query)
- Konversi bahasa natural (contoh: *"Tampilkan PO pending beserta nama vendor dari tabel EKKO dan EKPO"*) menjadi struktur node tabel, garis join, field output, dan filter.
- Didukung oleh model lokal **Ollama (qwen2.5:3b)**.
- Tombol **"Apply to Canvas"** langsung merender hasil AI ke React Flow Canvas.

### 7. Auto-Blast Telegram & Scheduler
- Penjadwalan laporan otomatis menggunakan **APScheduler**.
- Mendukung format cron expression (misal: `0 8 * * *` untuk blast setiap jam 8 pagi).
- Hasil laporan otomatis dieksekusi ke SAP, di-anonymize dengan Pandas, dan dikirimkan beserta file Excel (.xlsx) langsung ke akun/grup Telegram pengguna.

### 8. ABAP Smart Validator
- Menganalisis topologi relasi tabel di kanvas sebelum query dieksekusi.
- **Cartesian Product Prevention:** Mencegah eksekusi tabel tanpa join untuk menghindari timeout database di SAP.
- **Live Open SQL Preview:** Menghasilkan query ABAP Open SQL SELECT valid secara real-time.

---

## 🔐 KEAMANAN DATA (RULE 3 & RULE 4)
- Kredensial server SAP disimpan di tabel `smart_report.sap_server_profiles`.
- Semua password terenkripsi menggunakan **AES-Fernet** (`cryptography.fernet.Fernet`).
- Tidak ada password yang diekspos dalam response API publik. Password didekripsi hanya di memori saat request ke SAP gateway dilakukan.

---

## 🏃 PANDUAN MENJALANKAN SISTEM

### 1. Menjalankan Backend (FastAPI - Port 8001)
```bash
./start_backend.sh
```
Akses API Documentation: `http://localhost:8001/docs`

### 2. Menjalankan Frontend (Vite Dev Server - Port 5173)
```bash
./start_frontend.sh
```
Akses Web UI: `http://localhost:5173`

### 3. Akses Production Build
Web UI juga disajikan langsung oleh FastAPI pada:
`http://localhost:8001/`

---

## 🧪 PENGUJIAN OTOMATIS (UNIT TESTS)
Untuk menjalankan suite pengujian unit dan integrasi:
```bash
source backend/venv/bin/activate
PYTHONPATH=backend pytest backend/tests/
```
Hasil pengujian: **12 tests passed (100% Success)**

