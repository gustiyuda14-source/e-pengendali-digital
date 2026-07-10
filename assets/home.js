// assets/home.js - Beranda logic

document.addEventListener('DOMContentLoaded', async () => {
  const success = await fetchPdoData();
  document.getElementById('loading').style.display = 'none';
  if (!success) {
    showError('error-container');
    return;
  }
  
  renderShell('home');
  document.getElementById('main-content').style.display = 'block';

  const history = window.pdoData.history;
  const latest = history.latest;
  const weeks = history.weeks;
  
  // Hitung trend & mutasi
  const totalM = latest.nodes.filter(n => n.t === 'prog').reduce((a, b) => a + b.m, 0);
  const totalF = latest.nodes.filter(n => n.t === 'prog').reduce((a, b) => a + b.f, 0);
  const pagu = latest.pagu_total;
  const sisa = pagu - totalM;
  const delta = totalM - totalF;
  
  // Hero
  document.getElementById('hero-realisasi').textContent = `Rp ${rp(totalM)}`;
  document.getElementById('hero-pct').textContent = `${pct(totalM, pagu)}%`;
  
  if (delta > 0) {
    document.getElementById('hero-delta').innerHTML = `+Rp ${rp(delta)} <span style="font-weight:400; opacity:0.8; margin-left:6px">vs ${latest.prev_label}</span>`;
  } else {
    document.getElementById('hero-delta').innerHTML = `Tetap <span style="font-weight:400; opacity:0.8; margin-left:6px">vs ${latest.prev_label}</span>`;
    document.getElementById('hero-delta').className = 'chip chip-zero';
  }

  // Sparkline (trend history)
  const trendData = weeks.map(w => w.total_m);
  document.getElementById('hero-sparkline').innerHTML = sparklineSVG(trendData, 160, 40);

  // KPIs
  document.getElementById('kpi-pagu').textContent = `Rp ${rp(pagu)}`;
  document.getElementById('kpi-realisasi').textContent = `Rp ${rp(totalM)}`;
  document.getElementById('kpi-sisa').textContent = `Rp ${rp(sisa)}`;
  
  document.getElementById('kpi-last-label').textContent = `Naik vs ${latest.prev_label}`;
  if(delta > 0) {
    document.getElementById('kpi-last-val').textContent = `+Rp ${rp(delta)}`;
    document.getElementById('kpi-last-val').className = 'kpi-box-val text-lime-deep';
  } else {
    document.getElementById('kpi-last-val').textContent = 'Rp 0';
    document.getElementById('kpi-last-val').className = 'kpi-box-val text-ink-3';
  }
});
