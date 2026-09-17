# 🚀 SMART REPORT — ARSITEKTUR & PANDUAN FITUR LENGKAP
**Sistem Visual Reporting & Data Compare SAP Modern (Pengganti SAP SQVI)**

---

## 📑 DAFTAR ISI
1. [Ringkasan Proyek & Tech Stack](#-1-ringkasan-proyek--tech-stack)
2. [Arsitektur Sistem & Prinsip Desain](#-2-arsitektur-sistem--prinsip-desain)
   - [Pemisahan Konteks Antar Modul (Context Isolation)](#21-pemisahan-konteks-antar-modul-context-isolation)
   - [Peta Arsitektur State (Zustand Stores)](#22-peta-arsitektur-state-zustand-stores)
   - [Pipeline Eksekusi Paralel SAP (FastAPI & PyRFC)](#23-pipeline-eksekusi-paralel-sap-fastapi--pyrfc)
   - [Arsitektur Keamanan & Enkripsi Kredensial](#24-arsitektur-keamanan--enkripsi-kredensial)
3. [Katalog Fitur Utama](#-3-katalog-fitur-utama)
   - [1. Visual Query Canvas (React Flow)](#fitur-1-visual-query-canvas-react-flow)
   - [2. Next-Gen ALV Grid (AG Grid)](#fitur-2-next-gen-alv-grid-ag-grid)
   - [3. Variant Manager (Save/Load Layout)](#fitur-3-variant-manager-saveload-layout)
   - [4. Cross-Server Data Compare](#fitur-4-cross-server-data-compare)
   - [5. Parameter Seleksi & WHERE Filter (Selection Screen)](#fitur-5-parameter-seleksi--where-filter-selection-screen)
   - [6. Smart Export, Masking Finansial & Deduplikasi](#fitur-6-smart-export-masking-finansial--deduplikasi)
   - [7. AI Chat Assistant (Natural Language to Query)](#fitur-7-ai-chat-assistant-natural-language-to-query)
   - [8. Auto-Blast Telegram & Scheduler](#fitur-8-auto-blast-telegram--scheduler)
   - [9. ABAP Smart Validator](#fitur-9-abap-smart-validator)
   - [10. SAP Multi-Server Catalog & Live Health Check](#fitur-10-sap-multi-server-catalog--live-health-check)
4. [Fitur Multi-Bahasa (Multilanguage / i18n)](#-4-fitur-multi-bahasa-multilanguage--i18n)
5. [Fitur Tampilan (Dark Mode & Light Mode)](#-5-fitur-tampilan-dark-mode--light-mode)
6. [SOP & Standar Pengembangan (Setiap Buat Fitur Baru)](#-6-sop--standar-pengembangan-setiap-buat-fitur-baru)

---

## 🛠️ 1. RINGKASAN PROYEK & TECH STACK

**Smart Report** adalah platform web *modern enterprise* pengganti transaksi SAP SQVI (*QuickViewer*) berbasis visual canvas, grid interaktif berkecepatan tinggi, otomasi laporan berkala, komparasi data multi-server paralel, dan integrasi AI lokal.

### Tech Stack Utama
* **Frontend:**
  * **Framework:** React.js (Vite bundler)
  * **Visual Canvas:** React Flow (`@xyflow/react` v12) dengan *loose connection mode*
  * **Data Grid:** AG Grid Community (`ag-grid-react` v33) dengan *virtual scrolling*
  * **State Management:** Zustand (Stores modular terpisah)
  * **Styling:** TailwindCSS v4 dengan dukungan penuh Dark/Light Mode
  * **Icons:** Lucide React
* **Backend:**
  * **Framework:** FastAPI (Python 3.13) dengan *fully asynchronous handlers* (`async def`)
  * **Data Processing & Diff Engine:** Pandas & NumPy
  * **Excel Generator:** OpenPyXL (dengan styling SAP Classic Blue ALV)
  * **Koneksi SAP Gateway:** PyRFC / HTTP MCP RFC Gateway (`RFC_READ_TABLE`, `DD03M`, dsb.)
  * **Security & Kriptografi:** Cryptography (`AES-256 Fernet`)
  * **Scheduler:** APScheduler (Background task berbasis ekspresi cron)
* **Database:**
  * PostgreSQL (`ABAP_DB`), schema: `smart_report`
  * ORM: SQLAlchemy v2
* **AI Engine:**
  * Model Lokal: Ollama (`qwen2.5:3b` pada `http://localhost:11434`)
  * Fallback: OpenAI API

---

## 🏛️ 2. ARSITEKTUR SISTEM & PRINSIP DESAIN

### 2.1 Pemisahan Konteks Antar Modul (Context Isolation)

Salah satu prinsip arsitektur paling fundamental dalam Smart Report adalah **Isolasi Konteks**. Sistem dibagi menjadi 4 modul utama yang beroperasi secara independen:
1. **Query Studio (`studio`):** Perancangan query visual satu server, pemilihan kolom, kriteria seleksi WHERE, dan ALV Grid.
2. **Cross-Server Diff (`compare`):** Komparasi data paralel multi-server (Server A vs Server B), diffing baris/kolom, dan parameter komparasi.
3. **Auto-Blast Telegram (`schedules`):** Manajemen jadwal eksekusi otomatis, masking finansial, dan pengiriman bot.
4. **SAP Server Profiles (`servers`):** Katalog profil koneksi SAP host, SID, client, dan pengujian koneksi langsung.

#### Mengapa Konteks Harus Terpisah?
* **Top Navbar Kontekstual:** Navbar beradaptasi penuh terhadap modul yang aktif. Ketika berada di *Cross-Server Diff*, elemen Query Studio (seperti judul project report, server tunggal, tombol *Run Query*, dan *Tambah Tabel*) dihilangkan 100%. Navbar bertransformasi menjadi kontrol Server A vs Server B dan tombol *Jalankan Komparasi*.
* **Zero Header Stacking:** Setiap modul memiliki satu toolbar terintegrasi di navbar atas sehingga kanvas mendapatkan tinggi layar maksimal (*full height viewport*).

### 2.2 Peta Arsitektur State (Zustand Stores)

State aplikasi dibagi ke dalam store terpisah untuk menghindari *cross-contamination*:

```text
┌─────────────────────────────────────────────────────────────┐
│                       useAppStore                           │
│  - activeTab ('studio' | 'compare' | 'schedules' | 'servers')│
│  - theme ('dark' | 'light')                                 │
│  - servers (List Server SAP dari database)                  │
│  - activeServer (Server aktif untuk Query Studio)           │
│  - savedQueries, currentQueryId, currentQueryName           │
│  - Modal States (filterModalOpen, tableCatalogOpen, dsb.)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│       useCanvasStore        │ │       useCompareStore       │
│  - nodes, edges (Studio)    │ │  - nodes, edges (Compare)   │
│  - selectedFields (Studio)  │ │  - selectedFields (Compare) │
│  - filters (WHERE Studio)   │ │  - filters (WHERE Compare)  │
│  - pendingConnection        │ │  - serverAId, serverBId     │
│  - loadQueryDefinition()    │ │  - compareResult, isComparing│
│  - getQueryDefinition()     │ │  - compareViewMode          │
└─────────────────────────────┘ └─────────────────────────────┘
               │
┌──────────────▼──────────────┐
│        useGridStore         │
│  - rowData, columns         │
│  - viewMode ('canvas'/'split')│
│  - customColumns (+ fx)     │
│  - activeVariant            │
└─────────────────────────────┘
```

### 2.3 Pipeline Eksekusi Paralel SAP (FastAPI & PyRFC)

Dalam modul **Cross-Server Diff**, sistem mematuhi arsitektur non-blocking:
1. Frontend mengirim definisi query, `server_a_id`, `server_b_id`, dan `filters`.
2. Backend membuat dua task asinkron independen:
   ```python
   task_a = fetch_query_dataset(server_a, query, rowcount=req.rowcount)
   task_b = fetch_query_dataset(server_b, query, rowcount=req.rowcount)
   res_a, res_b = await asyncio.gather(task_a, task_b, return_exceptions=True)
   ```
3. Data dari kedua server ditarik **secara bersamaan (paralel)** melalui gateway PyRFC tanpa saling menunggu.
4. Hasil DataFrame `df_a` dan `df_b` dikomparasi dalam memori menggunakan **Pandas Engine** untuk menentukan status baris (`IDENTICAL`, `MODIFIED`, `ADDED_IN_B`, `DELETED_IN_B`).

### 2.4 Arsitektur Keamanan & Enkripsi Kredensial

* **Enkripsi Kredensial (AES-256 Fernet):** Password SAP yang dimasukkan pengguna dienkripsi dengan secret key sebelum disimpan di tabel `smart_report.sap_server_profiles`.
* **Zero Password Exposure:** Password tidak pernah dikirim balik ke client frontend pada response API profil server (hanya kolom masked `••••••••`).
* **In-Memory Decryption:** Password hanya didekripsi di dalam memori backend pada saat request RFC ke gateway SAP dijalankan.

---

## 🎯 3. KATALOG FITUR UTAMA

---

### FITUR 1: Visual Query Canvas (React Flow)
* **Deskripsi:** Kanvas interaktif tempat pengguna menyusun tabel SAP dan relasi join secara visual.
* **Fitur Utama:**
  * **Scroll Lock (`nowheel`):** Mengarahkan mouse ke kartu tabel memungkinkan pengguna melakukan scroll daftar field dengan lancar tanpa memicu zoom-in/zoom-out kanvas secara tidak sengaja.
  * **SAP DDIC Description:** Menampilkan technical name dan deskripsi kolom SAP secara bersamaan (misal: `CHARG - Batch Number`, `MATNR - Material Number`).
  * **Auto-Join Engine:** Ketika tabel kedua ditambahkan (misal `EKKO` lalu `EKPO`), sistem mencocokkan foreign key dari kamus data SAP (`DD08L`) dan otomatis menarik garis relasi (`EBELN ↔ EBELN`).
  * **Dual Connection Mode:**
    1. *Drag & Drop:* Menarik garis langsung dari port handle kanan/kiri (`loose connection mode`).
    2. *Click-to-Connect:* Mengklik icon link (`Link2`) pada field sumber, lalu mengklik field tujuan.
  * **Clean Edge Port Styling:** Handle port ditempatkan di tepi kartu dengan efek hover halus (`group-hover:opacity-100`) sehingga baris tabel diawali rapi langsung dengan kotak checkbox `[☑]`.

---

### FITUR 2: Next-Gen ALV Grid (AG Grid)
* **Deskripsi:** Tampilan tabel data dinamis berkemampuan tinggi menyerupai SAP GUI ALV Grid.
* **Fitur Utama:**
  * **Virtual DOM Scrolling:** Mampu merender ribuan baris data transaksi tanpa lag.
  * **Drag & Drop Column Reordering:** Urutan kolom dapat digeser langsung di grid.
  * **Custom Calculated Column (+ fx):** Menambahkan kolom formula dinamis langsung di browser (contoh formula: `row.MENGE * row.NETPR` atau `row.NETPR * 0.11`).
  * **Excel-Like Filtering & Multi-Column Sorting:** Klik header untuk sorting instan atau filter teks/angka.

---

### FITUR 3: Variant Manager (Save/Load Layout)
* **Deskripsi:** Pengelola tata letak (layout) laporan pengguna persis seperti fitur *Save Layout/Variant* di SAP GUI.
* **Fitur Utama:**
  * Menyimpan urutan kolom, status visibilitas kolom (tersembunyi/ditampilkan), formula kustom, dan filter kriteria seleksi ke database.
  * Memungkinkan beralih antar varian laporan dengan satu klik.

---

### FITUR 4: Cross-Server Data Compare
* **Deskripsi:** Membandingkan dataset tabel antara dua server SAP secara paralel (misal: Sandbox vs Development, atau QAS vs PRD).
* **Fitur Utama:**
  * **Toolbar Independen:** Memilih `SERVER A` dan `SERVER B` secara dinamis di navbar.
  * **Composite Key Matching:** Menggabungkan seluruh primary key menjadi kunci komposit pembanding (contoh tabel `MCH1`: `MATNR|CHARG`).
  * **Visual Diff Badges:**
    * 🟢 **BARU DI B (`ADDED_IN_B`):** Record data hanya ada di Server B.
    * 🔴 **HILANG DI B (`DELETED_IN_B`):** Record data ada di Server A tetapi tidak ditemukan di Server B.
    * 🟡 **DIMODIFIKASI (`MODIFIED`):** Kunci sama, tetapi satu atau lebih nilai kolom berbeda (menampilkan nilai lama $\rightarrow$ nilai baru).
    * ⚪ **IDENTIK (`IDENTICAL`):** Seluruh nilai kolom cocok persis.
  * **Row Inspector Modal:** Menginspeksi payload baris lengkap Server A vs Server B secara berdampingan (*side-by-side JSON comparison*).
  * **Multi-View Modes:** Mode Kanvas Penuh, Mode Split (Kanvas + Tabel Diff), dan Mode Hasil Diff Penuh.

---

### FITUR 5: Parameter Seleksi & WHERE Filter (Selection Screen)
* **Deskripsi:** Layar kriteria pembatas data (*WHERE clause*) ala Selection Screen SAP sebelum data ditarik.
* **Fitur Utama:**
  * **Dukungan Context-Aware:** Modal parameter otomatis menyesuaikan konteks apakah sedang dibuka di **Query Studio** atau di **Cross-Server Diff**.
  * **Operator Lengkap:** `=`, `<>`, `>`, `<`, `>=`, `<=`, `LIKE` (wildcard), `IN` (kumpulan nilai koma), dan `BETWEEN` (rentang dari .. sampai).
  * **Akses Cepat dari Baris Tabel:** Klik icon corong filter pada baris field mana pun di kartu tabel untuk langsung membuat parameter kolom tersebut.
  * **Active Filter Chips:** Parameter aktif ditampilkan sebagai chip kuning interaktif di kanvas (`WHERE: MCH1.MATNR EQ '0000352835'`).

---

### FITUR 6: Smart Export, Masking Finansial & Deduplikasi
* **Deskripsi:** Ekspor dataset ke format Excel (.xlsx) siap pakai dengan kepatuhan audit keamanan data.
* **Fitur Utama:**
  * **Data Masking (Anonymization):** Kolom sensitif seperti nomor rekening bank, IBAN, nilai vendor finansial (`BANKN`, `IBAN`, `WRBTR`, `NETPR`) otomatis disamarkan.
  * **Deduplikasi Baris:** Menghilangkan baris data berulang (duplikat) sebelum disajikan ke Excel.
  * **Professional SAP Theme:** File Excel yang di-generate menggunakan format header biru ALV, zebra striping, dan lebar kolom otomatis.

---

### FITUR 7: AI Chat Assistant (Natural Language to Query)
* **Deskripsi:** Asisten kecerdasan buatan berbasis LLM lokal (Ollama Qwen2.5) untuk mengonversi prompt bahasa natural menjadi susunan tabel dan join di kanvas.
* **Fitur Utama:**
  * Contoh prompt: *"Tampilkan data PO yang masih open beserta nama vendor dari tabel EKKO dan EKPO"*.
  * AI menganalisis kebutuhan tabel, kolom output, dan filter, lalu menyediakan tombol **"Apply to Canvas"** untuk langsung menyusun visual canvas.

---

### FITUR 8: Auto-Blast Telegram & Scheduler
* **Deskripsi:** Penjadwal eksekusi laporan berkala yang otomatis mengirimkan file Excel ke akun atau grup Telegram pengguna.
* **Fitur Utama:**
  * Penjadwalan berbasis ekspresi cron standar (contoh: `0 8 * * *` setiap jam 8 pagi).
  * Integrasi bot Telegram dengan pengiriman dokumen langsung dan pesan ringkasan.

---

### FITUR 9: ABAP Smart Validator
* **Deskripsi:** Mesin analisis logika sebelum query dikirim ke database SAP.
* **Fitur Utama:**
  * **Cartesian Product Prevention:** Mendeteksi tabel terisolasi tanpa garis join untuk mencegah query macet atau server SAP kehabisan memori.
  * **Live Open SQL Preview:** Menghasilkan kode ABAP `SELECT ... FROM ... INNER JOIN ...` secara langsung di panel validator.

---

### FITUR 10: SAP Multi-Server Catalog & Live Health Check
* **Deskripsi:** Manajemen katalog koneksi server SAP (Development, Testing, Sandbox, Production).
* **Fitur Utama:**
  * Pengujian konektivitas live ke SAP gateway dengan tombol **"Test Koneksi"**.
  * Status server visual (badge PRD merah untuk server produksi).

---

## 🌐 4. FITUR MULTI-BAHASA (MULTILANGUAGE / i18N)

Sistem Smart Report dirancang untuk mendukung multi-bahasa pada dua lapisan:

### 1. Lapisan Antarmuka Pengguna (UI Localization)
* **Bahasa yang Didukung:** Bahasa Indonesia (`id`) dan Bahasa Inggris (`en`).
* **Arsitektur Implementasi:**
  * Kamus string antarmuka disimpan dalam modul i18n (`src/locales/id.json` dan `src/locales/en.json`).
  * Pemilihan bahasa disimpan di `localStorage` (`smart_report_locale`) dan diakses secara reaktif melalui `useAppStore`.
  * Seluruh label, tombol, tooltip, dan pesan notifikasi membaca nilai terjemahan dinamis.

### 2. Lapisan Kamus Data SAP (SAP DDIC Localization)
* Di sistem SAP, tabel kamus data `DD03M` dan `DD04T` menyimpan deskripsi field dalam berbagai bahasa sesuai kode bahasa SAP (`SPRAS`):
  * `D` = Deutsch / Jerman
  * `E` = English / Inggris
  * `3` = Bahasa Indonesia
* Service `sap_metadata_sync` di backend membaca parameter bahasa saat melakukan sinkronisasi metadata tabel, sehingga deskripsi field yang ditampilkan di kartu kanvas dan ALV grid sesuai dengan preferensi bahasa pengguna.

---

## 🌓 5. FITUR TAMPILAN (DARK MODE & LIGHT MODE)

Smart Report memiliki sistem tema bawaan yang terintegrasi di seluruh komponen:

### 1. Mekanisme Kerja
* Menggunakan fitur `class` variant dari **TailwindCSS** (`dark:`).
* Root elemen `<html>` diberikan class `.dark` untuk mengaktifkan palet gelap.
* Status tema disimpan di `localStorage` dengan key `smart_sqvi_theme`.
* Saat pertama kali aplikasi dimuat, sistem mengecek `localStorage`. Jika belum ada, sistem membaca preferensi browser/OS (`window.matchMedia('(prefers-color-scheme: dark)')`).

### 2. Palet Warna Desain
* **Dark Mode:**
  * Background Utama: `slate-950` / `slate-900`
  * Card / Node: `slate-900` dengan border `slate-800`
  * Teks: `slate-100` (primer), `slate-400` (sekunder)
  * Aksen Studio: `sky-500` / `sky-400`
  * Aksen Compare: `purple-500` / `purple-400`
* **Light Mode:**
  * Background Utama: `slate-50`
  * Card / Node: `white` dengan border `slate-200`
  * Teks: `slate-800` (primer), `slate-500` (sekunder)
* **Peralihan Cepat:** Pengguna dapat menekan tombol toggle tema di pojok kiri bawah sidebar kapan saja.

---

## 📋 6. SOP & STANDAR PENGEMBANGAN (SETIAP BUAT FITUR BARU)

Ketika merancang dan mengimplementasikan fitur baru di Smart Report, ikuti standar operasional berikut:

### 1. Prinsip Pemisahan Konteks (No Context Bleeding)
* **Pastikan setiap fitur berada di modul yang tepat.** Jangan menaruh kontrol Query Studio ke dalam modul Compare atau sebaliknya.
* Jika menambahkan toolbar atau tombol aksi global, cek `activeTab` pada `Navbar.jsx` agar kontrol hanya muncul pada tab yang relevan.

### 2. Manajemen State Modular (Zustand)
* Jangan mencampur state kanvas Studio dengan kanvas Compare. Gunakan `useCanvasStore` untuk Query Studio dan `useCompareStore` untuk Cross-Server Diff.
* State global umum (notifikasi, tema, server catalog, modal) dikelola di `useAppStore`.
* State grid ALV dikelola di `useGridStore`.

### 3. Kompilasi Frontend & Static Build
Setiap kali ada perubahan file di `frontend/src/`:
```bash
cd frontend && npm run build
rm -rf ../dist/* && cp -r dist/* ../dist/
```
*Pastikan tidak ada warning sintaks, error import, atau bundler error.*

### 4. Pengujian Otomatis Backend (Pytest)
Setiap kali menambahkan atau mengubah endpoint API atau service backend:
```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/
```
*Seluruh pengujian unit harus berstatus 100% Passed.*

### 5. Aturan Ketat Git (STRICT RULE: NO AUTO PUSH)
* **DILARANG KERAS** menjalankan `git push` secara otomatis.
* Simpan perubahan hanya melalui commit lokal di mesin pengguna:
```bash
git add -A && git commit -m "feat/fix: deskripsi ringkas perubahan"
```

---

*Dokumen ini diperbarui secara berkala mengikuti iterasi dan penambahan arsitektur sistem Smart Report.*
