"""build_site.py — Agregator data untuk situs PDO multi-halaman.

Membaca seluruh snapshot archive/YYYY-MM-DD.html (bukti audit, read-only),
mengagregasi jadi dua file JSON yang dikonsumsi halaman statis:

  data/history.json  → ringkasan per minggu + tree lengkap minggu terbaru
                       + laporan mingguan (md→HTML). Dipakai Beranda/Dashboard/Riwayat.
  data/series.json   → time series per item & per (item, rekening) lintas minggu.
                       Dipakai halaman Lacak Rekening.

Tidak menulis/mengubah file arsip apa pun. Dipanggil dari deploy_pages()
di pdo_update.py, atau standalone: python3 build_site.py
"""
from __future__ import annotations

import html as html_mod
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import pdo_update
from pdo_update import PROJ, REK6, parse_baseline, parse_date

NUM_TO_BULAN_FULL = {v: k for k, v in pdo_update.BULAN_FULL_TO_NUM.items()}


def unescape_js(s: str) -> str:
    """Buka escape JS dari parse_baseline: \\' → ', \\\\ → \\ ."""
    return re.sub(r"\\(.)", r"\1", s)


# ─── Kumpulkan minggu dari arsip ─────────────────────────────

def collect_weeks(archive_dir: Path) -> list[dict]:
    """Parse tiap archive/YYYY-MM-DD.html → list minggu ascending by iso."""
    weeks = []
    for f in sorted(archive_dir.glob("????-??-??.html")):
        base = parse_baseline(f)
        pm = re.search(r"const PAGU_TOTAL\s*=\s*(\d+)", base["html"])
        if not pm:
            raise ValueError(f"PAGU_TOTAL tidak ditemukan di {f.name}")
        weeks.append(dict(
            iso=f.stem,
            label=base["curr_date"],
            prev_label=base["prev_date"],
            pagu_total=int(pm.group(1)),
            nodes=base["nodes"],
        ))
    if not weeks:
        raise ValueError(f"Tidak ada snapshot di {archive_dir}")
    return weeks


# ─── Konverter markdown report → HTML ────────────────────────

def _md_inline(s: str) -> str:
    """Inline markdown pada teks yang SUDAH di-escape HTML."""
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w])_([^_]+)_(?![\w])", r"<em>\1</em>", s)
    return s


def _md_table(lines: list[str]) -> str:
    """Render blok baris '|...|' jadi <table>. Baris ke-2 = separator alignment."""
    def cells(line: str) -> list[str]:
        return [c.strip() for c in line.strip().strip("|").split("|")]

    header = cells(lines[0])
    aligns = []
    for sep in cells(lines[1]):
        aligns.append("right" if sep.endswith(":") else "left")
    while len(aligns) < len(header):
        aligns.append("left")

    out = ["<table><thead><tr>"]
    for i, h in enumerate(header):
        out.append(f'<th class="ta-{aligns[i]}">{_md_inline(h)}</th>')
    out.append("</tr></thead><tbody>")
    for line in lines[2:]:
        out.append("<tr>")
        for i, c in enumerate(cells(line)):
            al = aligns[i] if i < len(aligns) else "left"
            out.append(f'<td class="ta-{al}">{_md_inline(c)}</td>')
        out.append("</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def render_report_html(md_text: str) -> str:
    """Konversi report build_diff_report (subset markdown) → HTML aman."""
    lines = html_mod.escape(md_text).splitlines()
    out, i, n = [], 0, len(lines)
    while i < n:
        line = lines[i]
        strip = line.strip()
        if not strip:
            i += 1
            continue
        if strip.startswith("|"):
            tbl = []
            while i < n and lines[i].strip().startswith("|"):
                tbl.append(lines[i])
                i += 1
            out.append(_md_table(tbl) if len(tbl) >= 2 else f"<p>{_md_inline(strip)}</p>")
            continue
        if strip.startswith("## "):
            out.append(f"<h3>{_md_inline(strip[3:])}</h3>")
        elif strip.startswith("# "):
            out.append(f"<h2>{_md_inline(strip[2:])}</h2>")
        elif re.fullmatch(r"-{3,}", strip):
            out.append("<hr>")
        else:
            out.append(f"<p>{_md_inline(strip)}</p>")
        i += 1
    return "".join(out)


# ─── history.json ────────────────────────────────────────────

def _prog_rollup(nodes: list[dict]) -> dict:
    return {
        nd["kode"]: dict(p=nd["p"], m=nd["m_old"], f=nd["f_old"])
        for nd in nodes if nd["type"] == "prog"
    }


def _node_to_json(nd: dict) -> dict:
    """Node parse_baseline → bentuk RAW_DATA (nama di-unescape)."""
    out = dict(t=nd["type"], k=nd["kode"], n=unescape_js(nd["nama"]),
               p=nd["p"], m=nd["m_old"], f=nd["f_old"])
    if nd["pg"]:
        out["pg"] = nd["pg"]
    if nd["sk"]:
        out["sk"] = nd["sk"]
    if nd["type"] == "item":
        out["details"] = [
            dict(k=d["k"], n=unescape_js(d["n"]), p=d["p"], c10=d["c10"],
                 c11p=d["c11p"], c11n=d["c11n"], total=d["total"],
                 sisa=d["sisa"], delta=d["delta"])
            for d in nd["details_old"]
        ]
    return out


def build_history(weeks: list[dict], reports_dir: Path) -> dict:
    wk_out = []
    prev_total = None
    prev_pagu = None
    for w in weeks:
        prog = _prog_rollup(w["nodes"])
        total_m = sum(p["m"] for p in prog.values())
        total_f = sum(p["f"] for p in prog.values())
        wk_out.append(dict(
            iso=w["iso"], label=w["label"], prev_label=w["prev_label"],
            pagu_total=w["pagu_total"], total_m=total_m, total_f=total_f,
            naik=(total_m - prev_total) if prev_total is not None else None,
            pagu_changed=(prev_pagu is not None and w["pagu_total"] != prev_pagu),
            snapshot=f"archive/{w['iso']}.html",
            has_report=(reports_dir / f"{w['iso']}.md").exists(),
            prog=prog,
        ))
        prev_total, prev_pagu = total_m, w["pagu_total"]

    latest_w = weeks[-1]
    curr_d = parse_date(latest_w["label"])
    prev_d = parse_date(latest_w["prev_label"])
    latest = dict(
        iso=latest_w["iso"], label=latest_w["label"], prev_label=latest_w["prev_label"],
        pagu_total=latest_w["pagu_total"],
        bulan=NUM_TO_BULAN_FULL.get(curr_d[1], "") if curr_d else "",
        bulan_prev=NUM_TO_BULAN_FULL.get(prev_d[1], "") if prev_d else "",
        nodes=[_node_to_json(nd) for nd in latest_w["nodes"]],
    )

    reports_html = {}
    for w in wk_out:
        if w["has_report"]:
            md = (reports_dir / f"{w['iso']}.md").read_text(encoding="utf-8")
            reports_html[w["iso"]] = render_report_html(md)

    return dict(
        generated=datetime.now().isoformat(timespec="seconds"),
        weeks=wk_out, latest=latest, reports_html=reports_html,
    )


# ─── series.json ─────────────────────────────────────────────

def build_series(weeks: list[dict]) -> dict:
    n_weeks = len(weeks)
    week_isos = [w["iso"] for w in weeks]
    week_labels = [w["label"].rsplit(" ", 1)[0] for w in weeks]  # '10 Jul 2026' → '10 Jul'

    items: dict[str, dict] = {}
    rek: dict[str, dict] = {}

    for wi, w in enumerate(weeks):
        subkeg_names = {nd["kode"]: unescape_js(nd["nama"])
                        for nd in w["nodes"] if nd["type"] == "subkeg"}
        for nd in w["nodes"]:
            if nd["type"] != "item":
                continue
            ik = nd["kode"]
            if ik not in items:
                items[ik] = dict(n="", sk=nd["sk"] or "", sk_n="",
                                 p=[None] * n_weeks, m=[None] * n_weeks)
            it = items[ik]
            it["n"] = unescape_js(nd["nama"])          # nama terbaru menang
            it["sk_n"] = subkeg_names.get(nd["sk"] or "", it["sk_n"])
            it["p"][wi] = nd["p"]
            it["m"][wi] = nd["m_old"]

            for d in nd["details_old"]:
                key = f"{ik}|{d['k']}"
                if key not in rek:
                    rek[key] = dict(rk=d["k"], n="", item=ik, item_n="",
                                    p_latest=0, first_week=wi, s=[None] * n_weeks)
                r = rek[key]
                r["n"] = unescape_js(d["n"])
                r["item_n"] = unescape_js(nd["nama"])
                if d["p"] > 0:
                    r["p_latest"] = d["p"]
                r["s"][wi] = [d["c10"], d["c11p"], d["c11n"],
                              d["total"], d["sisa"], d["delta"]]

    return dict(weeks=week_isos, week_labels=week_labels, items=items, rek=rek)


# ─── Validasi keras sebelum tulis ────────────────────────────

def validate(history: dict, series: dict) -> None:
    wks = history["weeks"]
    isos = [w["iso"] for w in wks]
    assert isos == sorted(isos), "weeks tidak ascending"
    assert len(set(isos)) == len(isos), "iso duplikat"

    for w in wks:
        assert sum(p["m"] for p in w["prog"].values()) == w["total_m"], \
            f"Σprog.m != total_m di {w['iso']}"
        assert w["pagu_total"] > 0, f"pagu_total 0 di {w['iso']}"

    latest = history["latest"]
    assert latest["iso"] == isos[-1], "latest bukan minggu terakhir"
    lat_prog_m = sum(nd["m"] for nd in latest["nodes"] if nd["t"] == "prog")
    assert lat_prog_m == wks[-1]["total_m"], "total latest != minggu terakhir"

    n_weeks = len(series["weeks"])
    assert series["weeks"] == isos, "series.weeks != history.weeks"
    for ik, it in series["items"].items():
        assert len(it["p"]) == n_weeks and len(it["m"]) == n_weeks, f"panjang seri item {ik}"
    for key, r in series["rek"].items():
        assert REK6.match(r["rk"]), f"kode rekening invalid: {r['rk']} ({key})"
        assert len(r["s"]) == n_weeks, f"panjang seri rek {key}"
        assert r["s"][r["first_week"]] is not None, f"first_week salah: {key}"

    for iso in history["reports_html"]:
        assert iso in isos, f"report tanpa snapshot: {iso}"


# ─── Orkestrasi ──────────────────────────────────────────────

def build_all(proj: Path) -> dict:
    """Bangun data/history.json + data/series.json. Raise kalau data tidak konsisten."""
    weeks = collect_weeks(proj / "archive")
    history = build_history(weeks, proj / "reports")
    series = build_series(weeks)
    validate(history, series)

    data_dir = proj / "data"
    data_dir.mkdir(exist_ok=True)
    for name, obj in (("history.json", history), ("series.json", series)):
        (data_dir / name).write_text(
            json.dumps(obj, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")

    return dict(
        n_weeks=len(weeks),
        latest_label=history["latest"]["label"],
        n_items=len(series["items"]),
        n_rek=len(series["rek"]),
        n_reports=len(history["reports_html"]),
    )


def main() -> int:
    info = build_all(PROJ)
    print(f"  ✅ data/history.json + data/series.json")
    print(f"     {info['n_weeks']} minggu · terbaru {info['latest_label']} · "
          f"{info['n_items']} item · {info['n_rek']} rekening · {info['n_reports']} laporan")
    return 0


if __name__ == "__main__":
    sys.exit(main())
