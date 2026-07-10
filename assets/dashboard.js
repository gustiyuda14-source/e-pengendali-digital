// assets/dashboard.js

let expanded = new Set();
let rawData = [];
let LATEST = null;
let PAGU_TOTAL = 0;
let PREV_DATE = '';
let CURR_DATE = '';

document.addEventListener('DOMContentLoaded', async () => {
  const success = await fetchPdoData();
  document.getElementById('loading').style.display = 'none';
  if (!success) return showError('error-container');
  
  LATEST = window.pdoData.history.latest;
  rawData = LATEST.nodes;
  PAGU_TOTAL = LATEST.pagu_total;
  PREV_DATE = LATEST.prev_label;
  CURR_DATE = LATEST.label;
  
  renderShell('dashboard');
  document.getElementById('main-content').style.display = 'block';
  
  document.getElementById('dash-subtitle').innerHTML = `Minggu Lalu (${PREV_DATE}) → <span style="font-weight:600; color:var(--lime-chart)">${CURR_DATE}</span> | 🔍 Klik item tabel untuk detail`;
  document.getElementById('th-curr').textContent = CURR_DATE;
  document.getElementById('progTitle').textContent = `3 Program Monitoring — ${CURR_DATE}`;

  buildKPI();
  buildProgRealisasi();
  buildAlerts();
  buildTable();
});

function buildKPI() {
  const tm = rawData.filter(x => x.t === 'prog').reduce((a, b) => a + b.m, 0);
  const tf = rawData.filter(x => x.t === 'prog').reduce((a, b) => a + b.f, 0);
  const d = tm - tf;
  const sisa = PAGU_TOTAL - tm;
  
  const kr = rawData.filter(x => x.t === 'subkeg' && x.p && (x.m / x.p * 100) >= 90).length;
  const wr = rawData.filter(x => x.t === 'subkeg' && x.p && (x.m / x.p * 100) < 20 && x.m > 0).length;
  const naik = rawData.filter(x => x.t === 'subkeg' && x.m > x.f).length;
  
  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-box" style="border-top:3px solid #38BDF8">
      <div class="kpi-box-lbl">Total Pagu</div>
      <div class="kpi-box-val">Rp ${rp(PAGU_TOTAL)}</div>
      <div class="text-xs text-ink-3 mt-1">TA 2026 (Tetap)</div>
    </div>
    <div class="kpi-box" style="border-top:3px solid var(--warn)">
      <div class="kpi-box-lbl">Minggu Lalu</div>
      <div class="kpi-box-val">Rp ${rp(tf)}</div>
      <div class="text-xs text-ink-3 mt-1">${pct(tf, PAGU_TOTAL)}% dari Pagu</div>
    </div>
    <div class="kpi-box" style="border-top:3px solid var(--lime-chart)">
      <div class="kpi-box-lbl">${CURR_DATE}</div>
      <div class="kpi-box-val">Rp ${rp(tm)}</div>
      <div class="text-xs text-ink-3 mt-1">${pct(tm, PAGU_TOTAL)}% dari Pagu</div>
    </div>
    <div class="kpi-box" style="border-top:3px solid var(--lime-deep)">
      <div class="kpi-box-lbl">Selisih Minggu Ini</div>
      <div class="kpi-box-val" style="color:var(--lime-deep)">+Rp ${rp(d)}</div>
      <div class="chip chip-up mt-2">+${pct(d, PAGU_TOTAL)}% pagu</div>
    </div>
    <div class="kpi-box" style="border-top:3px solid var(--danger)">
      <div class="kpi-box-lbl">Sub-Keg Kritis/Warn</div>
      <div class="kpi-box-val">${kr} Kritis / ${wr} Warn</div>
      <div class="chip chip-danger mt-2">dari 12 Sub-Keg</div>
    </div>
    <div class="kpi-box" style="border-top:3px solid var(--lime-chart)">
      <div class="kpi-box-lbl">Sub-Keg Naik</div>
      <div class="kpi-box-val text-lime-deep">${naik} Sub-Keg</div>
      <div class="chip chip-up mt-2">ada penambahan</div>
    </div>
  `;

  document.getElementById('selisihBanner').innerHTML = `
    <div class="sel-item"><div class="sel-lbl">Minggu Lalu</div><div class="sel-val">Rp ${rp(tf)}</div></div>
    <div class="sel-item"><div class="sel-lbl">${CURR_DATE}</div><div class="sel-val">Rp ${rp(tm)}</div></div>
    <div class="sel-item"><div class="sel-lbl">Selisih</div><div class="sel-val">+Rp ${rp(d)}</div></div>
    <div class="sel-item" style="border:none"><div class="sel-lbl">Sisa Pagu</div><div class="sel-val" style="color:var(--warn-ink)">Rp ${rp(sisa)}</div></div>
  `;
}

function buildProgRealisasi() {
  let h = '';
  rawData.filter(x => x.t === 'prog').forEach(p => {
    const pF = p.p ? p.f / p.p * 100 : 0;
    const pM = p.p ? p.m / p.p * 100 : 0;
    const bc = barColor(pM);
    const d = p.m - p.f;
    h += `
      <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--border)">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px">
          <div style="font-size:11px; font-weight:600">${p.k} — ${p.n}</div>
          <div style="font-weight:700; color:${bc}">${pM.toFixed(1)}%</div>
        </div>
        <div style="font-size:10px; color:var(--ink-2); font-family:var(--mono); margin-bottom:6px">
          Pagu: Rp ${rp(p.p)} | +Rp ${rp(d)}
        </div>
        <div style="height:6px; background:var(--bg); border-radius:3px; overflow:hidden">
          <div style="height:100%; width:${Math.min(pM, 100)}%; background:${bc}; border-radius:3px"></div>
        </div>
      </div>
    `;
  });
  document.getElementById('progRealisasi').innerHTML = h;
}

function buildAlerts() {
  const subs = rawData.filter(x => x.t === 'subkeg').sort((a, b) => (b.p ? b.m / b.p : 0) - (a.p ? a.m / a.p : 0));
  let h = '';
  subs.forEach(sub => {
    const pc = sub.p ? sub.m / sub.p * 100 : 0;
    const d = sub.m - sub.f;
    const isDanger = pc >= 90;
    const isWarn = pc < 20 && pc > 0;
    const cls = isDanger ? 'chip-danger' : isWarn ? 'chip-warn' : 'chip-info';
    h += `
      <div style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--bg); border-radius:var(--radius-sm); border:1px solid var(--border)">
        <div class="chip ${cls}" style="flex-shrink:0; width:48px; justify-content:center">${pc.toFixed(0)}%</div>
        <div style="flex:1; min-width:0">
          <div style="font-weight:600; font-size:11px">${sub.k}</div>
          <div style="font-size:10px; color:var(--ink-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${sub.n}</div>
        </div>
        <div style="font-size:10px; font-weight:600; color:${d>0?'var(--lime-deep)':'var(--ink-3)'}">${d>0?'+Rp '+rp(d):'-'}</div>
      </div>
    `;
  });
  document.getElementById('alertsDiv').innerHTML = h;
}

function getStatHTML(m, p, f) {
  if (!p) return '<span class="chip chip-info">—</span>';
  const pc = m / p * 100;
  if (pc >= 90) return '<span class="chip chip-danger">KRITIS</span>';
  if (pc < 20 && pc > 0) return '<span class="chip chip-warn">WARN</span>';
  if (m === 0) return '<span class="chip chip-info">Nol</span>';
  if (m > f) return '<span class="chip chip-up">↑ NAIK</span>';
  return '<span class="chip chip-info">TETAP</span>';
}

function tog(k) {
  expanded.has(k) ? expanded.delete(k) : expanded.add(k);
  buildTable();
}

function buildTable() {
  let desk = '';
  let mob = '';
  
  rawData.forEach(item => {
    if(item.t !== 'prog') return;
    const isExp = expanded.has(item.k);
    const pc = item.p ? item.m / item.p * 100 : 0;
    const d = item.m - item.f;
    const sisa = item.p - item.m;
    
    // Desktop Prog
    desk += `
      <tr class="prog-row" onclick="tog('${item.k}')" style="cursor:pointer">
        <td class="mono text-lime-deep"><span style="display:inline-block;width:12px">${isExp?'▼':'▶'}</span>${item.k}</td>
        <td>${item.n}</td>
        <td class="r mono">${rp(item.p)}</td>
        <td class="r mono text-ink-2">${rp(item.f)}</td>
        <td class="r mono text-ink">${rp(item.m)}</td>
        <td class="r mono" style="color:var(--lime-deep); font-weight:600">${d>0?'+'+rp(d):'—'}</td>
        <td class="r mono text-ink-2">${rp(sisa)}</td>
        <td style="font-weight:600">${pc.toFixed(1)}%</td>
        <td>${getStatHTML(item.m, item.p, item.f)}</td>
      </tr>
    `;

    // Mobile Prog
    mob += `
      <div class="acc-card">
        <div class="acc-prog" onclick="tog('${item.k}')" style="cursor:pointer">
          <div style="display:flex; justify-content:space-between">
            <span class="text-lime-deep">${isExp?'▼':'▶'} ${item.k}</span>
            <span>${pc.toFixed(1)}%</span>
          </div>
          <div style="font-size:10px; font-weight:400; color:var(--ink-2); margin-top:4px">${item.n}</div>
        </div>
    `;

    if(!isExp) {
      mob += `</div>`; // close acc-card
      return;
    }
    
    // Subkegs
    rawData.filter(x => x.t === 'subkeg' && x.pg === item.k).forEach(sub => {
      const isSubExp = expanded.has(sub.k);
      const pc2 = sub.p ? sub.m / sub.p * 100 : 0;
      const d2 = sub.m - sub.f;
      const sisa2 = sub.p - sub.m;
      
      // Desktop Subkeg
      desk += `
        <tr class="subkeg-row ${d2>0?'bg-lime-soft':''}" onclick="tog('${sub.k}')" style="cursor:pointer; ${d2>0?'border-left:2px solid var(--lime-ink)':''}">
          <td class="mono text-warn-ink" style="padding-left:24px"><span style="display:inline-block;width:12px">${isSubExp?'▼':'▶'}</span>${sub.k}</td>
          <td style="font-weight:600">${sub.n}</td>
          <td class="r mono">${rp(sub.p)}</td>
          <td class="r mono text-ink-2">${rp(sub.f)}</td>
          <td class="r mono text-ink">${rp(sub.m)}</td>
          <td class="r mono" style="color:var(--lime-ink); font-weight:600">${d2>0?'+'+rp(d2):'—'}</td>
          <td class="r mono text-ink-2">${rp(sisa2)}</td>
          <td style="font-weight:600">${pc2.toFixed(1)}%</td>
          <td>${getStatHTML(sub.m, sub.p, sub.f)}</td>
        </tr>
      `;
      
      // Mobile Subkeg
      mob += `
        <div class="acc-sub" onclick="tog('${sub.k}')" style="cursor:pointer">
          <div style="display:flex; justify-content:space-between">
            <span class="text-warn-ink">${isSubExp?'▼':'▶'} ${sub.k}</span>
            <span>${pc2.toFixed(1)}%</span>
          </div>
          <div style="font-size:10px; font-weight:400; margin-top:4px">${sub.n}</div>
        </div>
      `;
      
      if(!isSubExp) return;
      
      // Items
      rawData.filter(x => x.t === 'item' && x.sk === sub.k).forEach(it => {
        const pc3 = it.p ? it.m / it.p * 100 : 0;
        const d3 = it.m - it.f;
        const sisa3 = it.p - it.m;
        
        const hasClick = d3 > 0 && it.details && it.details.length > 0;
        const onclick = hasClick ? `onclick="showModal('${it.k}')"` : '';
        const hoverCls = hasClick ? 'clickable' : '';
        const namaTxt = hasClick ? `<span style="color:var(--lime-chart); text-decoration:underline dotted">🔍 ${it.n.substring(0,60)}</span>` : it.n.substring(0,60);
        
        // Desktop Item
        desk += `
          <tr class="item-row ${hoverCls}" ${onclick}>
            <td class="mono text-ink-2" style="padding-left:44px">${it.k}</td>
            <td>${namaTxt}</td>
            <td class="r mono">${rp(it.p)}</td>
            <td class="r mono text-ink-2">${rp(it.f)}</td>
            <td class="r mono text-ink">${rp(it.m)}</td>
            <td class="r mono" style="color:var(--lime-deep); font-weight:600">${d3>0?'+'+rp(d3):'—'}</td>
            <td class="r mono text-ink-2">${rp(sisa3)}</td>
            <td style="font-weight:600">${pc3.toFixed(1)}%</td>
            <td>${getStatHTML(it.m, it.p, it.f)}</td>
          </tr>
        `;
        
        // Mobile Item
        mob += `
          <div class="acc-item ${hoverCls}" ${onclick}>
            <div class="mono text-ink-2" style="margin-bottom:4px">${it.k}</div>
            <div style="font-weight:600; margin-bottom:8px">${namaTxt}</div>
            <div style="display:flex; justify-content:space-between; font-size:10px; font-family:var(--mono)">
              <span class="text-ink-2">Rp ${rp(it.f)}</span>
              <span class="text-lime-deep">Rp ${rp(it.m)}</span>
            </div>
            <div style="text-align:right; font-size:10px; font-weight:700; color:var(--lime-deep); margin-top:4px">
              ${d3>0?'+Rp '+rp(d3):''}
            </div>
          </div>
        `;
      });
    });
    
    mob += `</div>`; // close acc-card for prog
  });
  
  document.getElementById('tbody').innerHTML = desk;
  document.getElementById('accordionBody').innerHTML = mob;
}

// ─── Modal Detail ─────────────────────────────────────────────
function showModal(kode) {
  const it = rawData.find(x => x.k === kode && x.t === 'item');
  if(!it) return;
  const d = it.m - it.f;
  const pc = (it.p ? (it.m / it.p * 100) : 0).toFixed(2);
  
  const bulanCurr = LATEST.bulan;
  const bulanPrev = LATEST.bulan_prev;
  
  let h = `
    <div style="background:var(--bg); padding:16px; border-radius:var(--radius-sm); margin-bottom:20px; border-left:4px solid var(--lime-chart)">
      <div style="font-size:10px; color:var(--ink-2); font-weight:600; text-transform:uppercase; margin-bottom:4px">KODE ITEM</div>
      <div style="font-size:14px; font-weight:700; color:var(--ink); font-family:var(--mono)">${it.k}</div>
      <div style="font-size:12px; margin-top:4px">${it.n}</div>
    </div>
  `;
  
  const itemNaik = (it.m - it.f) > 0;
  const anyDetNaik = (it.details||[]).some(x => x.delta > 0);
  
  // Rule: Penyesuaian periode lalu banner
  if (itemNaik && !anyDetNaik) {
    h += `
      <div style="background:var(--warn-soft); border:1px solid rgba(245,158,11,0.3); border-left:4px solid var(--warn); border-radius:var(--radius-sm); padding:12px 16px; margin-bottom:16px; font-size:11px; color:var(--warn-ink); line-height:1.5">
        <strong style="display:block; margin-bottom:4px">ℹ️ Catatan</strong>
        Kenaikan <strong>+Rp ${rp(it.m - it.f)}</strong> bersifat <em>penyesuaian pencatatan periode s.d. ${bulanPrev}</em> — belum ada realisasi tercatat di ${bulanCurr} untuk rekening item ini.
      </div>
    `;
  }
  
  (it.details||[]).forEach(det => {
    const isUp = det.delta > 0;
    
    // ATURAN 4: Struktur 6 Baris WAJIB
    h += `
      <div class="rek-card" style="${isUp?'border-color:rgba(101,163,13,0.4); border-left:3px solid var(--lime-deep)':''}">
        <div class="rek-hdr" style="${isUp?'background:var(--lime-soft)':''}">
          <div class="rek-kode" style="${isUp?'color:var(--lime-ink)':''}">${det.k}</div>
          <div class="rek-nama" style="${isUp?'color:var(--lime-ink)':''}">${det.n}</div>
        </div>
        <div>
          <!-- 1. Realisasi Bulan Lalu -->
          <div class="rek-row">
            <span class="rek-lbl">Realisasi s.d. ${bulanPrev} <small>(Kol.10 SPJ)</small></span>
            <span class="rek-val text-ink-2">Rp ${rp(det.c10)}</span>
          </div>
          <!-- 2. Realisasi Minggu Lalu -->
          <div class="rek-row">
            <span class="rek-lbl">Realisasi Awal ${bulanCurr} <small>(per ${PREV_DATE})</small></span>
            <span class="rek-val text-ink-2">${det.c11p > 0 ? 'Rp '+rp(det.c11p) : '—'}</span>
          </div>
          <!-- 3. Realisasi per CURR_DATE -->
          <div class="rek-row">
            <span class="rek-lbl">Realisasi per ${CURR_DATE} <small>(Kol.11 SPJ ini)</small></span>
            <span class="rek-val text-lime-deep">Rp ${rp(det.c11n)}</span>
          </div>
          <!-- 4. Total Realisasi -->
          <div class="rek-row" style="background:var(--bg)">
            <span class="rek-lbl" style="font-weight:600; color:var(--ink)">Total Realisasi Saat Ini</span>
            <span class="rek-val" style="color:var(--ink)">Rp ${rp(det.total)}</span>
          </div>
          <!-- 5. Sisa Anggaran -->
          <div class="rek-row">
            <span class="rek-lbl">Sisa Anggaran</span>
            <span class="rek-val text-warn-ink">Rp ${rp(det.sisa)}</span>
          </div>
          <!-- 6. Kenaikan Minggu Ini -->
          <div class="rek-row" style="${isUp?'background:var(--lime-soft)':''}">
            <span class="rek-lbl" style="${isUp?'font-weight:600; color:var(--lime-ink)':''}">Kenaikan Minggu Ini</span>
            <span class="rek-val" style="${isUp?'color:var(--lime-ink); font-weight:700':''}">${isUp ? '+Rp '+rp(det.delta) : '—'}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  document.getElementById('modalBody').innerHTML = h;
  const modal = document.getElementById('detailModal');
  modal.classList.add('active');
  
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
