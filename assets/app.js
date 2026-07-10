// assets/app.js - Shared utilities and data fetching for PDO

const rp = n => (!n || n === 0) ? '0' : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pct = (n, t) => (!t || !n) ? '0.00' : (n / t * 100).toFixed(2);
const parseIso = iso => {
  if(!iso) return null;
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
const barColor = p => p >= 90 ? 'var(--danger)' : p >= 50 ? 'var(--warn)' : p >= 20 ? 'var(--lime-chart)' : p > 0 ? 'var(--lime-chart)' : 'var(--border-2)';

// Global State
window.pdoData = {
  history: null,
  series: null,
  isError: false,
};

async function fetchPdoData() {
  try {
    const [histRes, seriesRes] = await Promise.all([
      fetch('./data/history.json'),
      fetch('./data/series.json')
    ]);
    if (!histRes.ok || !seriesRes.ok) throw new Error('Gagal memuat data');
    window.pdoData.history = await histRes.json();
    window.pdoData.series = await seriesRes.json();
    return true;
  } catch (err) {
    console.error(err);
    window.pdoData.isError = true;
    return false;
  }
}

function renderShell(activePage) {
  const latest = window.pdoData.history?.latest;
  const label = latest ? latest.label : '';
  
  const shellHtml = `
    <div class="nav-shell">
      <div class="logo-chip">PDO</div>
      <a href="./index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Beranda</a>
      <a href="./dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
      <a href="./riwayat.html" class="nav-link ${activePage === 'riwayat' ? 'active' : ''}">Riwayat</a>
      <a href="./rekening.html" class="nav-link ${activePage === 'rekening' ? 'active' : ''}">Lacak Rekening</a>
    </div>
  `;
  const headerContainer = document.getElementById('shell-header');
  if (headerContainer) headerContainer.innerHTML = shellHtml;

  const footerHtml = `
    <div class="footer">
      Sumber: SPJ Fungsional SIPD · diperbarui ${label}
    </div>
  `;
  const footerContainer = document.getElementById('shell-footer');
  if (footerContainer) footerContainer.innerHTML = footerHtml;
}

function showError(containerId, message) {
  const c = document.getElementById(containerId);
  if (c) c.innerHTML = `<div class="error-card">${message || 'Gagal memuat data PDO.'}</div>`;
}
