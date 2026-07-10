// assets/riwayat.js

document.addEventListener('DOMContentLoaded', async () => {
  const success = await fetchPdoData();
  document.getElementById('loading').style.display = 'none';
  if (!success) return showError('error-container');
  
  renderShell('riwayat');
  document.getElementById('main-content').style.display = 'block';

  const history = window.pdoData.history;
  const weeks = history.weeks;
  const reports = history.reports_html || {};
  
  // Charts
  const labels = weeks.map(w => w.label);
  const totalData = weeks.map(w => w.total_m);
  const mutasiData = weeks.map((w, i) => i === 0 ? null : (w.total_m - weeks[i-1].total_m)); // mutasi total
  
  const trendContainer = document.getElementById('chart-trend');
  trendContainer.innerHTML = lineChartSVG(labels, totalData, trendContainer.clientWidth, 240, true);

  const mutasiContainer = document.getElementById('chart-mutasi');
  mutasiContainer.innerHTML = barChartSVG(labels, mutasiData, mutasiContainer.clientWidth, 180, true);

  // Pagu Changed Markers
  let chartWrapper = trendContainer.querySelector('svg');
  if(chartWrapper) {
    const w = trendContainer.clientWidth - 40;
    const dx = weeks.length > 1 ? w / (weeks.length - 1) : w;
    weeks.forEach((wk, i) => {
      if (wk.pagu_changed) {
        const x = 20 + i*dx;
        chartWrapper.insertAdjacentHTML('beforeend', `
          <g transform="translate(${x}, 10)">
            <rect x="-35" y="0" width="70" height="16" rx="8" fill="var(--warn-soft)" stroke="rgba(245,158,11,0.2)"></rect>
            <text x="0" y="11" font-size="8" font-weight="600" fill="var(--warn-ink)" text-anchor="middle">PAGU REVISI</text>
            <line x1="0" y1="16" x2="0" y2="190" stroke="var(--warn-ink)" stroke-dasharray="2" opacity="0.3"></line>
          </g>
        `);
      }
    });
  }

  // Cards per week (reverse)
  let h = '';
  const revWeeks = [...weeks].reverse();
  
  revWeeks.forEach(wk => {
    const isNewest = wk.iso === history.latest.iso;
    const pagu = wk.pagu_total;
    const m = wk.total_m;
    const f = wk.total_f;
    const pc = (m / pagu * 100).toFixed(1);
    const d = m - f;
    const naikStr = d > 0 ? `+Rp ${rp(d)}` : (wk.naik === null ? 'Awal' : 'Tetap');
    
    // Progs mini
    let progsH = '';
    if (wk.prog) {
      Object.keys(wk.prog).forEach(pk => {
        const p = wk.prog[pk];
        const ppc = p.p ? (p.m / p.p * 100) : 0;
        progsH += `
          <div style="flex:1; background:var(--bg); padding:8px; border-radius:4px; text-align:center">
            <div style="font-size:9px; color:var(--ink-2); font-weight:600; margin-bottom:4px">Prog ${pk}</div>
            <div style="height:4px; background:var(--border); border-radius:2px; margin:0 auto; width:80%">
              <div style="height:100%; width:${Math.min(ppc, 100)}%; background:var(--lime-chart); border-radius:2px"></div>
            </div>
            <div style="font-size:9px; font-weight:600; margin-top:4px">${ppc.toFixed(1)}%</div>
          </div>
        `;
      });
    }

    h += `
      <div class="card" style="${isNewest ? 'border-color:var(--lime-chart); box-shadow:0 0 0 1px var(--lime-chart)' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:12px">
          <div>
            <div style="font-size:14px; font-weight:600; color:var(--ink)">
              ${wk.label} ${isNewest ? '<span class="chip chip-up" style="margin-left:8px; font-size:9px">TERBARU</span>' : ''}
              ${wk.pagu_changed ? '<span class="chip chip-warn" style="margin-left:8px; font-size:9px">PAGU REVISI</span>' : ''}
            </div>
            <div style="font-size:11px; color:var(--ink-2); margin-top:4px; font-family:var(--mono)">ISO: ${wk.iso}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px; font-weight:700; font-family:var(--mono); color:var(--ink)">Rp ${rp(m)} <span style="font-size:12px; color:var(--ink-3); font-weight:500">(${pc}%)</span></div>
            <div style="font-size:11px; font-weight:600; color:${d>0?'var(--lime-deep)':'var(--ink-3)'}; margin-top:4px">${d>0?'Naik ':'Mutasi: '}${naikStr}</div>
          </div>
        </div>
        
        <div style="display:flex; gap:8px; margin-bottom:16px">
          ${progsH}
        </div>
        
        <div style="display:flex; gap:12px; border-top:1px solid var(--border); padding-top:16px">
          <button onclick="toggleReport('${wk.iso}')" style="background:var(--ink); color:#fff; border:none; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:500; cursor:pointer; font-family:var(--font)">📝 Buka Laporan</button>
          <a href="./archive/${wk.snapshot.split('/').pop()}" target="_blank" style="background:var(--bg); color:var(--ink-2); border:1px solid var(--border); padding:8px 16px; border-radius:20px; font-size:12px; font-weight:500; text-decoration:none; display:inline-block">↗️ Versi Asli (Arsip)</a>
        </div>
        
        <div id="report-${wk.iso}" style="display:none; margin-top:16px; padding:16px; background:var(--bg); border-radius:var(--radius-sm); border:1px solid var(--border)">
          ${wk.has_report && reports[wk.iso] ? `<div class="markdown-content">${reports[wk.iso]}</div>` : '<div style="color:var(--ink-2); font-size:12px; font-style:italic">Laporan tidak tersedia untuk snapshot ini.</div>'}
        </div>
      </div>
    `;
  });
  
  document.getElementById('history-list').innerHTML = h;
});

window.toggleReport = function(iso) {
  const el = document.getElementById(`report-${iso}`);
  if(el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
};
