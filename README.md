# e-pengendali-digital

Dashboard realisasi anggaran **Inspektorat Pemprov Sulawesi Tenggara TA 2026** — update mingguan dari SPJ Fungsional SIPD.

🌐 **Lihat dashboard:** [https://e-pengendali-digital.vercel.app/dashboard.html](https://e-pengendali-digital.vercel.app/dashboard.html)
📅 **Snapshot terkini:** 17 Jul 2026
📂 **Arsip mingguan:** [archive/](archive/)

## Update Workflow

Tiap GU baru:
```bash
python3 pdo_update.py "pdf_fungsional/Fungsional Per <tgl>_<bln>_<thn>.pdf"
```

Script otomatis: extract PDF → hitung rolling snapshot → generate HTML + report → push ke GitHub (Vercel auto-deploy).

Lihat `pdo_update.py --help` untuk flag tambahan.
