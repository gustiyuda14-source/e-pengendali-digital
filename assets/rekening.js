// assets/rekening.js

let seriesData = null;
let historyData = null;
let currentSelection = null; // { type: 'rek'|'item', key: string }

document.addEventListener('DOMContentLoaded', async () => {
  const success = await fetchPdoData();
  document.getElementById('loading').style.display = 'none';
  if (!success) return showError('error-container');
  
  renderShell('rekening');
  document.getElementById('main-content').style.display = 'block';

  seriesData = window.pdoData.series;
  historyData = window.pdoData.history;
  
  const searchInput = document.getElementById('searchInput');
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(e.target.value);
      updateHash(e.target.value, currentSelection ? currentSelection.key : '');
    }, 300);
  });
  
  // Read hash on load
  readHash();
});

function readHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const q = params.get('q');
  const sel = params.get('sel');
  
  if(q) {
    document.getElementById('searchInput').value = q;
    performSearch(q);
  }
  if(sel) {
    // Determine type from key format
    const isRek = sel.includes('|');
    selectItem(isRek ? 'rek' : 'item', sel);
  }
}

function updateHash(q, sel) {
  const params = new URLSearchParams();
  if(q) params.set('q', q);
  if(sel) params.set('sel', sel);
  const newHash = params.toString();
  window.history.replaceState(null, null, newHash ? `#${newHash}` : window.location.pathname);
}

function performSearch(query) {
  query = (query || '').trim().toLowerCase();
  const resDiv = document.getElementById('searchResults');
  const hintDiv = document.getElementById('searchHint');
  
  if (query.length < 3) {
    resDiv.style.display = 'none';
    resDiv.innerHTML = '';
    hintDiv.style.display = 'block';
    return;
  }
  
  hintDiv.style.display = 'none';
  
  // Search items
  const items = Object.entries(seriesData.items).filter(([k, v]) => {
    return k.includes(query) || v.n.toLowerCase().includes(query);
  }).map(([k, v]) => ({ type: 'item', key: k, kode: k, nama: v.n }));
  
  // Search rekening
  const reks = Object.entries(seriesData.rek).filter(([k, v]) => {
    return v.rk.includes(query) || v.n.toLowerCase().includes(query);
  }).map(([k, v]) => ({ type: 'rek', key: k, kode: v.rk, nama: v.n }));
  
  const results = [...items, ...reks].slice(0, 50); // limit 50
  
  if (results.length === 0) {
    resDiv.innerHTML = '<div style="padding:16px; text-align:center; color:var(--ink-3); font-size:12px">Tidak ada hasil ditemukan.</div>';
    resDiv.style.display = 'block';
    return;
  }
  
  let h = '';
  results.forEach(r => {
    const isAct = currentSelection && currentSelection.key === r.key;
    const badge = r.type === 'item' ? '<span class="chip chip-info" style="font-size:9px">Item</span>' : '<span class="chip chip-up" style="font-size:9px">Rekening</span>';
    h += `
      <div class="res-item ${isAct ? 'active' : ''}" onclick="selectItem('${r.type}', '${r.key}')">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px">
          <div class="res-kode">${r.kode}</div>
          ${badge}
        </div>
        <div class="res-title">${r.nama}</div>
      </div>
    `;
  });
  
  resDiv.innerHTML = h;
  resDiv.style.display = 'block';
}

function selectItem(type, key) {
  currentSelection = { type, key };
  updateHash(document.getElementById('searchInput').value, key);
  
  // Re-render search results to highlight active
  performSearch(document.getElementById('searchInput').value);
  
  const panel = document.getElementById('detailPanel');
  panel.classList.add('active');
  
  const data = type === 'item' ? seriesData.items[key] : seriesData.rek[key];
  if(!data) return; // not found
  
  const kodeStr = type === 'item' ? key : data.rk;
  const isRek = type === 'rek';
  
  // Header
  document.getElementById('det-badge').innerHTML = isRek ? '<span class="chip chip-up">Tingkat: Rekening SPJ</span>' : '<span class="chip chip-info">Tingkat: Item Kegiatan</span>';
  document.getElementById('det-nama').textContent = data.n;
  document.getElementById('det-kode').textContent = kodeStr;
  
  document.getElementById('det-parent-item').textContent = isRek ? `${data.item} — ${data.item_n}` : `— (Ini adalah Item)`;
  document.getElementById('det-subkeg').textContent = isRek ? `(dari Item Induk)` : `${data.sk} — ${data.sk_n}`;
  
  // Extract time series
  const labels = seriesData.week_labels;
  const wks = seriesData.weeks;
  
  let totals = [];
  let mutasi = [];
  let tableRows = [];
  let p_latest = 0;
  let first_week = 0;
  
  if (isRek) {
    p_latest = data.p_latest;
    first_week = data.first_week;
    
    let prevTotal = 0;
    for (let i = 0; i < labels.length; i++) {
      const snap = data.s[i];
      if (!snap) {
        totals.push(null);
        mutasi.push(null);
        tableRows.push(null);
        continue;
      }
      // snap = [c10, c11p, c11n, total, sisa, delta]
      const total = snap[3];
      const mut = total - prevTotal; // mutasi total
      
      totals.push(total);
      mutasi.push(i === 0 ? null : mut);
      
      tableRows.push({
        lbl: labels[i],
        iso: wks[i],
        c10: snap[0],
        c11p: snap[1],
        c11n: snap[2],
        total: total,
        sisa: snap[4],
        mutasi: i === 0 ? null : mut
      });
      
      prevTotal = total;
    }
  } else {
    // Item
    let prevTotal = 0;
    // Find latest pagu for this item
    const lastValidIdx = [...data.p].reverse().findIndex(x => x !== null && x > 0);
    p_latest = lastValidIdx >= 0 ? data.p[data.p.length - 1 - lastValidIdx] : 0;
    
    first_week = data.m.findIndex(x => x !== null);
    if(first_week < 0) first_week = 0;
    
    for (let i = 0; i < labels.length; i++) {
      const m = data.m[i];
      if (m === null) {
        totals.push(null);
        mutasi.push(null);
        tableRows.push(null);
        continue;
      }
      
      const total = m;
      const mut = total - prevTotal;
      
      totals.push(total);
      mutasi.push(i === 0 ? null : mut);
      
      tableRows.push({
        lbl: labels[i],
        iso: wks[i],
        c10: null, // item doesn't have components in series
        c11p: null,
        c11n: null,
        total: total,
        sisa: data.p[i] ? data.p[i] - total : null,
        mutasi: i === 0 ? null : mut
      });
      
      prevTotal = total;
    }
  }
  
  // Find latest valid total
  const lastTotalIdx = [...totals].reverse().findIndex(x => x !== null);
  const totalTerkini = lastTotalIdx >= 0 ? totals[totals.length - 1 - lastTotalIdx] : 0;
  const sisaTerkini = p_latest - totalTerkini;
  const pcTerkini = p_latest ? (totalTerkini / p_latest * 100).toFixed(2) : 0;
  
  // Update Mini KPI
  document.getElementById('det-total').textContent = `Rp ${rp(totalTerkini)}`;
  document.getElementById('det-pagu').textContent = `Rp ${rp(p_latest)}`;
  document.getElementById('det-sisa').textContent = `Rp ${rp(sisaTerkini)}`;
  document.getElementById('det-pct').textContent = `${pcTerkini}%`;
  
  // Notice
  const noticeDiv = document.getElementById('det-notice');
  if (first_week > 0) {
    noticeDiv.innerHTML = `⚠️ <strong>Rekening Baru:</strong> Baru muncul di SPJ pada snapshot <strong>${labels[first_week]}</strong>. Tidak ada data di minggu-minggu sebelumnya.`;
    noticeDiv.style.display = 'block';
  } else {
    noticeDiv.style.display = 'none';
  }
  
  // Charts
  const tc = document.getElementById('det-chart-total');
  const mc = document.getElementById('det-chart-mutasi');
  tc.innerHTML = lineChartSVG(labels, totals, tc.clientWidth, 180, true);
  mc.innerHTML = barChartSVG(labels, mutasi, mc.clientWidth, 140, true);
  
  // Table
  const revTable = tableRows.map((r, i) => ({r, i})).reverse();
  
  let deskH = '';
  let mobH = '';
  
  revTable.forEach(({r, i}) => {
    if (!r) {
      // Belum muncul
      deskH += `<tr><td><strong>${labels[i]}</strong></td><td colspan="6" style="text-align:center; color:var(--ink-3); font-style:italic">Belum ada di SPJ</td></tr>`;
      mobH += `<div class="wk-card"><div class="wk-row" style="font-weight:600"><span>${labels[i]}</span><span style="color:var(--ink-3); font-style:italic">Belum ada di SPJ</span></div></div>`;
      return;
    }
    
    // Format mutasi
    const mStr = r.mutasi === null ? '—' : (r.mutasi > 0 ? `<span style="color:var(--lime-deep); font-weight:700">+Rp ${rp(r.mutasi)}</span>` : `<span style="color:var(--ink-3)">Rp 0</span>`);
    
    if (isRek) {
      deskH += `
        <tr>
          <td><strong>${r.lbl}</strong></td>
          <td class="r mono text-ink-2">${rp(r.c10)}</td>
          <td class="r mono text-ink-2">${rp(r.c11p)}</td>
          <td class="r mono text-lime-deep">${rp(r.c11n)}</td>
          <td class="r mono" style="font-weight:600">${rp(r.total)}</td>
          <td class="r mono">${mStr}</td>
          <td class="r mono text-warn-ink">${rp(r.sisa)}</td>
        </tr>
      `;
      
      mobH += `
        <div class="wk-card">
          <div class="wk-row" style="border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:8px">
            <span style="font-weight:600; font-size:12px">${r.lbl}</span>
            <span class="mono" style="font-weight:700; font-size:13px">Rp ${rp(r.total)}</span>
          </div>
          <div class="wk-row"><span class="text-ink-2">c10</span><span class="mono">Rp ${rp(r.c10)}</span></div>
          <div class="wk-row"><span class="text-ink-2">c11p</span><span class="mono">Rp ${rp(r.c11p)}</span></div>
          <div class="wk-row"><span class="text-ink-2">c11n</span><span class="mono text-lime-deep">Rp ${rp(r.c11n)}</span></div>
          <div class="wk-row" style="margin-top:8px; border-top:1px dashed var(--border); padding-top:8px"><span style="font-weight:600">Mutasi Total</span><span class="mono">${mStr}</span></div>
          <div class="wk-row"><span class="text-ink-2">Sisa Pagu</span><span class="mono text-warn-ink">Rp ${rp(r.sisa)}</span></div>
        </div>
      `;
    } else {
      deskH += `
        <tr>
          <td><strong>${r.lbl}</strong></td>
          <td class="r" colspan="3" style="color:var(--ink-3); text-align:center; font-style:italic">N/A (Level Item)</td>
          <td class="r mono" style="font-weight:600">${rp(r.total)}</td>
          <td class="r mono">${mStr}</td>
          <td class="r mono text-warn-ink">${r.sisa !== null ? rp(r.sisa) : '—'}</td>
        </tr>
      `;
      
      mobH += `
        <div class="wk-card">
          <div class="wk-row" style="border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:8px">
            <span style="font-weight:600; font-size:12px">${r.lbl}</span>
            <span class="mono" style="font-weight:700; font-size:13px">Rp ${rp(r.total)}</span>
          </div>
          <div class="wk-row" style="margin-top:8px;"><span style="font-weight:600">Mutasi Total</span><span class="mono">${mStr}</span></div>
          <div class="wk-row"><span class="text-ink-2">Sisa Pagu</span><span class="mono text-warn-ink">${r.sisa !== null ? 'Rp '+rp(r.sisa) : '—'}</span></div>
        </div>
      `;
    }
  });
  
  document.getElementById('det-tbody').innerHTML = deskH;
  document.getElementById('det-mobile').innerHTML = mobH;
}
