// assets/charts.js - Hand-rolled SVG charts for PDO

function createSVGNode(n, v) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", n);
  for (const p in v) el.setAttributeNS(null, p, v[p]);
  return el;
}

function sparklineSVG(data, width=150, height=40) {
  const clean = (data || []).filter(v => v !== null && v !== undefined);
  if (clean.length === 0) return '';
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const range = max - min || 1;
  const paddingX = 4;
  const paddingY = 4;
  const w = width - paddingX * 2;
  const h = height - paddingY * 2;
  const dx = w / (clean.length > 1 ? clean.length - 1 : 1);

  let d = `M ${paddingX} ${height - paddingY - ((clean[0]-min)/range)*h}`;
  for(let i=1; i<clean.length; i++) {
    d += ` L ${paddingX + i*dx} ${height - paddingY - ((clean[i]-min)/range)*h}`;
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="var(--lime-chart)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${paddingX + (clean.length-1)*dx}" cy="${height - paddingY - ((clean[clean.length-1]-min)/range)*h}" r="3" fill="var(--surface)" stroke="var(--lime-chart)" stroke-width="2"/>
    </svg>
  `;
}

function lineChartSVG(labels, data, width=600, height=200, isWhiteBg=false) {
  if (!data || data.length === 0) return '';
  const max = Math.max(...data) * 1.1; // 10% headroom
  const min = 0; // always start from 0 for total
  const range = max - min || 1;
  const padX = 20;
  const padY = 20;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const dx = data.length > 1 ? w / (data.length - 1) : w;
  
  const limeColor = isWhiteBg ? 'var(--lime-deep)' : 'var(--lime-chart)';

  let pathD = `M ${padX} ${height - padY - ((data[0]||0)/range)*h}`;
  let areaD = `M ${padX} ${height - padY} L ${padX} ${height - padY - ((data[0]||0)/range)*h}`;
  
  let points = '';
  for(let i=0; i<data.length; i++) {
    const val = data[i];
    if(val === null) continue; // skip null points (belum muncul)
    
    const x = padX + i*dx;
    const y = height - padY - (val/range)*h;
    
    if(i>0) {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
    
    points += `<circle cx="${x}" cy="${y}" r="4" fill="var(--surface)" stroke="${limeColor}" stroke-width="2"><title>${labels[i]}: Rp ${rp(val)}</title></circle>`;
  }
  
  areaD += ` L ${padX + (data.length-1)*dx} ${height - padY} Z`;

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow:visible">
      <defs>
        <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${limeColor}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${limeColor}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <line x1="${padX}" y1="${padY}" x2="${width-padX}" y2="${padY}" stroke="var(--border)" stroke-dasharray="4" />
      <line x1="${padX}" y1="${height/2}" x2="${width-padX}" y2="${height/2}" stroke="var(--border)" stroke-dasharray="4" />
      <line x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}" stroke="var(--border-2)" />
      
      <!-- Area & Line -->
      <path d="${areaD}" fill="url(#areaGradient)" />
      <path d="${pathD}" fill="none" stroke="${limeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${points}
    </svg>
  `;
}

function barChartSVG(labels, data, width=600, height=150, isWhiteBg=false) {
  if (!data || data.length === 0) return '';
  const max = Math.max(...data.map(d => d||0)) * 1.1;
  const range = max || 1;
  const padX = 20;
  const padY = 20;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const barW = Math.max((w / data.length) * 0.6, 4); // 60% of slot width, min 4px
  const dx = w / data.length;
  const limeColor = isWhiteBg ? 'var(--lime-deep)' : 'var(--lime-chart)';

  let rects = '';
  for(let i=0; i<data.length; i++) {
    const val = data[i];
    if(val === null || val <= 0) continue;

    const x = padX + i*dx + (dx - barW)/2;
    const barH = (val/range)*h;
    const y = height - padY - barH;

    rects += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${limeColor}" rx="2" opacity="0.85"><title>${labels[i]}: +Rp ${rp(val)}</title></rect>`;
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow:visible">
      <!-- Grid lines -->
      <line x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}" stroke="var(--border-2)" />
      ${rects}
    </svg>
  `;
}
