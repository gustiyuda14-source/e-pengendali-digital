# CLAUDE.md — Pengendali Digital ON (PDO)
**Inspektorat Pemprov Sulawesi Tenggara · TA 2026**
**User: Bli Gus (Bendahara) · gustiyuda14@gmail.com**

---

## Konteks Proyek

Dashboard HTML single-file untuk memantau **realisasi anggaran mingguan** Inspektorat Sultra TA 2026.
Data bersumber dari **SPJ Fungsional SIPD** (format PDF). Update dilakukan setiap ada GU/SPJ baru.

- **Total Pagu TA 2026:** Rp 24.335.335.344
- **3 Program:** 6.01 (Penunjang), 6.02 (Pengawasan), 6.03 (Kebijakan & Asistensi)
- **Struktur:** Program → Sub-Kegiatan → Item → Detail Rekening

---

## File Utama

| File | Keterangan |
|------|-----------|
| `pengendali_digital_on_redesign_april_24_2026.html` | Versi redesign dark premium (baseline) |
| `pengendali_digital_on_gu5_mei_1_2026.html` | Update GU 5 per 1 Mei 2026 (terkini) |
| `CLAUDE.md` | File ini — panduan kerja |

**Konvensi penamaan file baru:** `pengendali_digital_on_[deskripsi]_[bulan]_[tgl]_[tahun].html`

---

## ATURAN KRITIS — WAJIB DIIKUTI

### ATURAN 1: JANGAN Fabrikasi Kode Rekening
Kode rekening SIPD **TIDAK BOLEH ditebak atau dikarang**. Selalu extract dari PDF SPJ.
- Kode yang terlihat masuk akal tapi tidak dari PDF = **SALAH MUTLAK**
- Jika PDF tidak tersedia → `details: []` (kosong), tunggu PDF dari user
- Contoh kesalahan lama: `5.1.02.02.001.00040` (karangan) vs `5.1.02.02.001.00061` (dari PDF)

### ATURAN 2: Format Kode Rekening 6 Segmen
```
BENAR:  5.1.02.04.001.00001  (6 segmen)
SALAH:  5.1.02.04.01.0001    (5 segmen — format lama/salah)
```
Validasi: `\d+\.\d+\.\d+\.\d+\.\d+\.\d+` — harus tepat 6 bagian.

### ATURAN 3: Jangan Ubah Data Saat Redesign UI
Saat diminta ubah tampilan/warna/font: **ZERO changes pada RAW_DATA, angka, atau fitur**.
Hanya boleh menyentuh CSS dan template literal HTML.

### ATURAN 4: Struktur Modal — 6 Baris Per Rekening
Modal detail harus menampilkan TEPAT 6 baris:
1. **Realisasi Bulan Lalu** (s.d. Maret · Kol.10 SPJ) → `c10`
2. **Realisasi Minggu Lalu** (PREV_DATE · Kol.11 lalu) → `c11p`
3. **Realisasi per CURR_DATE** (Kol.11 baru) → `c11n`
4. **Total Realisasi** (c10 + c11n) → `total`
5. **Sisa Anggaran** → `sisa`
6. **Kenaikan Minggu Ini** (c11n − c11p) → `delta`

Gunakan layout card vertikal (`.rek-card`, `.rek-row`) — **BUKAN tabel HTML** (menyebabkan horizontal scroll).

### ATURAN 5: Mapping Kolom SPJ — Index Python (0-based)

PDF SPJ Fungsional SIPD → pdfplumber:

| Index Python | Kolom SPJ | Field |
|---|---|---|
| `row[0]` | Kode Rekening/Kegiatan | kode |
| `row[1]` | Uraian/Nama | nama |
| `row[2]` | Pagu | `p` |
| `row[9]` | UP/GU/TU s.d. Bulan Lalu | **`c10`** |
| `row[10]` | UP/GU/TU Bulan Ini | **`c11n`** |
| `row[12]` | Total SPJ (Kol 13) | **`m`** (total item) |
| `row[13]` | Sisa Pagu | `sisa` |

> **PENTING:** Selalu debug dengan print seluruh row untuk crosscheck. Salah satu index = semua data salah.

### ATURAN 6: Clickable Hanya Jika Ada Kenaikan + Data
```javascript
const hasClick = delta > 0 && it.details && it.details.length > 0;
```
Item tanpa kenaikan atau tanpa detail rekening = TIDAK clickable.

---

## Alur Update Mingguan (Workflow Baku)

```
1. User upload PDF SPJ baru  →  file masuk ke uploads/
2. cp uploads/xxx.pdf outputs/spj_new.pdf
3. Run pdfplumber → extract c10, c11n, total per rekening + total per kegiatan
4. Baca HTML file terakhir → ambil c11n lama = c11p baru
5. Hitung:
     f_baru  = m_lama
     m_baru  = total dari PDF baru (Kol 13)
     c11p    = c11n lama
     c11n    = Kol 11 baru
     delta   = c11n_baru - c11p
6. Update RAW_DATA di HTML
7. Update PREV_DATE, CURR_DATE, title
8. Simpan file baru dengan nama tanggal
```

### Perhatian saat ganti tanggal:
```python
# URUTAN YANG BENAR — jangan dibalik!
html = html.replace("const PREV_DATE  = 'XX'", "const PREV_DATE  = '[tanggal lama CURR_DATE]'")
html = html.replace("const CURR_DATE  = 'XX'", "const CURR_DATE  = '[tanggal baru]'")
# JANGAN pakai replace("'tanggal lama'", "'tanggal baru'") tanpa prefix const!
# → akan ikut mengganti PREV_DATE yang baru saja di-set!
```

---

## Data Model JavaScript

### Konstanta
```javascript
const PAGU_TOTAL = 24335335344;
const PREV_DATE  = '24 Apr 2026';  // tanggal snapshot minggu lalu
const CURR_DATE  = '1 Mei 2026';   // tanggal update terkini
```

### Node Types dalam RAW_DATA
```javascript
// Program
{t:'prog', k:'6.01', n:'NAMA', p:pagu, m:realisasi_kini, f:realisasi_lalu}

// Sub-Kegiatan
{t:'subkeg', k:'6.01.01.1.01', n:'Nama', p:pagu, m:0, f:0, pg:'6.01'}

// Item (tanpa detail)
{t:'item', k:'6.01.01.1.01.0001', n:'Nama', p:pagu, m:0, f:0, sk:'6.01.01.1.01'}

// Item (dengan detail rekening)
{t:'item', k:'6.01.01.1.05.0011', n:'Nama', p:pagu, m:38580126, f:0, sk:'6.01.01.1.05',
  details:[
    {k:'5.1.02.04.001.00001', n:'Belanja Perjalanan Dinas Biasa',
     p:pagu_rek, c10:0, c11p:0, c11n:38580126, total:38580126, sisa:35999874, delta:38580126}
  ]}
```

### Relasi Snapshot Mingguan
```
Update baru:
  m_baru   = total realisasi dari PDF baru (Kol 13)
  f_baru   = m_lama (realisasi minggu sebelumnya)
  c11p_baru = c11n_lama
  c11n_baru = nilai Kol 11 dari PDF baru
  delta    = c11n_baru - c11p_baru

  c10 TIDAK BERUBAH sampai ada SPJ bulan baru
```

---

## Script Python Ekstraksi PDF

```python
import pdfplumber, re

REK6_PATTERN = re.compile(r'^(\d+\.\d+\.\d+\.\d+\.\d+\.\d+)$')
KEG_PATTERN  = re.compile(r'^(6\.\d{2}\.\d{2}\.\d\.\d{2}\.\d{4})$')

def parse_money(s):
    """Parse format Rp Indonesia: Rp1.234.567,00 → 1234567"""
    if not s or str(s).strip() in ['-', '', 'None']: return 0
    s = re.sub(r'^Rp\s*', '', str(s).strip())
    s = re.sub(r',\d+$', '', s)   # hapus desimal koma
    s = s.replace('.', '')         # hapus titik ribuan
    try: return int(s)
    except: return 0

# Struktur tabel: row[0]=kode, row[9]=c10, row[10]=c11n, row[12]=total
```

**Format rupiah PDF terbaru (`Rp1.234.567,00`)** berbeda dari format lama — gunakan `parse_money` di atas, bukan `re.sub(r'[.,\s]', '', s)` yang akan salah 100x lipat.

---

## Tema Visual (Dark Premium)

```css
:root {
  --bg: #0F172A;        /* navy background */
  --surface: #1A2540;
  --primary: #38BDF8;   /* biru langit */
  --success: #34D399;   /* hijau (realisasi baru) */
  --violet: #A78BFA;    /* ungu (delta/kenaikan) */
  --danger: #F87171;    /* merah (kritis) */
  --amber: #FBBF24;     /* amber (warning/sisa) */
  --font: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
}
```

Font: **Inter** (UI) + **JetBrains Mono** (angka/kode) via Google Fonts CDN.

---

## Kode Rekening Valid yang Sudah Diverifikasi

| Kode | Nama | Kegiatan |
|------|------|----------|
| 5.1.02.02.012.00001 | Belanja Kursus Singkat/Pelatihan | 6.01.01.1.05.0009 |
| 5.1.02.04.001.00001 | Belanja Perjalanan Dinas Biasa | berbagai item |
| 5.1.02.04.001.00003 | Belanja Perjalanan Dinas Dalam Kota | berbagai item |
| 5.1.02.01.001.00024 | Belanja ATK - Alat Tulis Kantor | 6.01.01.1.06.0004 |
| 5.1.02.01.001.00025 | Belanja ATK - Kertas dan Cover | 6.01.01.1.06.0004 |
| 5.1.02.01.001.00052 | Belanja Makanan dan Minuman Rapat | 6.01.01.1.06.0008 |
| 5.1.02.01.001.00053 | Belanja Makanan dan Minuman Jamuan Tamu | 6.01.01.1.06.0008 |
| 5.1.02.02.001.00061 | Belanja Tagihan Listrik | 6.01.01.1.08.0002 |
| 5.1.02.02.001.00063 | Belanja Internet/TV Berlangganan | 6.01.01.1.08.0002 |
| 5.1.02.03.002.00035 | Belanja Pemeliharaan Alat Angkutan | 6.01.01.1.09.0002 |
| 5.1.02.03.002.00121 | Belanja Pemeliharaan AC | 6.01.01.1.09.0010 |
| 5.1.02.02.001.00005 | Honorarium Keterangan Ahli | 6.01.02.1.02.0002 |
| 5.1.02.02.001.00080 | Honorarium Penanggungjawab Pengelolaan Keuangan | 6.01.01.1.02.0007 |

---

## Snapshot Terkini — GU 5 per 1 Mei 2026

| Program | Pagu | Realisasi | % |
|---------|------|-----------|---|
| 6.01 Penunjang | 20.320.297.344 | 6.886.095.954 | 33.89% |
| 6.02 Pengawasan | 3.317.241.000 | 904.023.316 | 27.25% |
| 6.03 Kebijakan | 697.797.000 | 123.190.000 | 17.66% |
| **TOTAL** | **24.335.335.344** | **7.913.309.270** | **32.52%** |

---

## Kesalahan yang Pernah Terjadi & Solusi

| # | Kesalahan | Solusi |
|---|-----------|--------|
| 1 | Fabrikasi kode rekening (`00040` padahal `00061`) | Selalu extract dari PDF, jangan tebak |
| 2 | Format kode 5 segmen (`5.1.02.02.01.0061`) | Pakai regex 6-segmen, PDF sebagai kebenaran |
| 3 | Parser angka salah 100x (`1.234.567,00` → `123456700`) | Hapus desimal koma dulu, baru hapus titik ribuan |
| 4 | PREV_DATE ikut berubah saat replace tanggal | Replace dengan prefix `const PREV_DATE =` bukan hanya string tanggal |
| 5 | Modal pakai tabel HTML → horizontal scroll | Pakai layout card vertikal `.rek-card` `.rek-row` |
| 6 | Kolom SPJ salah index | row[0]=kode, row[9]=c10, row[10]=c11n, row[12]=total (format baru `Rp`) |
| 7 | Item clickable meski delta=0 | Cek `delta > 0 && details.length > 0` |
| 8 | Ubah data saat redesign UI | Pisahkan: redesign = hanya CSS/warna, update data = hanya RAW_DATA |
