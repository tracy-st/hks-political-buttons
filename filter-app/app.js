// app.js — loads data/colors_output.csv, renders grid, filters by color hex and color name

const CSV_PATH = '../data/colors_output_local.csv';
let rows = [];
let filtered = [];
let page = 0;
let perPage = 60;

document.addEventListener('DOMContentLoaded', () => {
  hookControls();
  loadCSV();
});

function hookControls(){
  document.getElementById('tolerance').addEventListener('input', (e)=>{
    document.getElementById('tolValue').textContent = e.target.value;
  });
  // single tolerance display (applies to both pickers)
  const tol = document.getElementById('tolerance');
  if(tol){
    tol.addEventListener('input', (e)=>{ document.getElementById('tolValue').textContent = e.target.value; });
  }
  document.getElementById('applyColorFilter').addEventListener('click', applyFilters);
  document.getElementById('applySearch').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', ()=>{
    document.getElementById('colorPicker').value = '#ff0000';
    document.getElementById('colorPicker2').value = '#0000ff';
    document.getElementById('colorNameFilter').value = '';
    document.getElementById('searchHex').value = '';
    document.getElementById('tolerance').value = 60;
    document.getElementById('tolValue').textContent = 60;
    // single tolerance used for both pickers
    applyFilters();
  });
  document.getElementById('perPage').addEventListener('change',(e)=>{ perPage = parseInt(e.target.value); renderGrid(); });
  document.getElementById('prevPage').addEventListener('click', ()=>{ if(page>0) {page--; renderGrid()} });
  document.getElementById('nextPage').addEventListener('click', ()=>{ if((page+1)*perPage < filtered.length) {page++; renderGrid()} });
  // apply filters when the color-name dropdown changes
  const colorNameSel = document.getElementById('colorNameFilter');
  if(colorNameSel){
    colorNameSel.addEventListener('change', applyFilters);
  }
  const colorPicker2 = document.getElementById('colorPicker2');
  if(colorPicker2){ colorPicker2.addEventListener('input', ()=>{}); }
  document.getElementById('closeModal').addEventListener('click', closeModal);
}

function loadCSV(){
  Papa.parse(CSV_PATH, {
    header:true,
    download:true,
    skipEmptyLines:true,
    complete: (results)=>{
      console.log(results.data);
      rows = results.data.map(normalizeRow);
      filtered = [...rows];
      renderGrid();
    },
    error: (err)=>{
      console.error('CSV load error', err);
      const grid = document.getElementById('grid');
      grid.innerHTML = '<div class="meta">Error loading CSV. If you opened this file directly from the filesystem, please run a static server (see README).</div>';
    }
  })
}


function normalizeRow(r){
  // expect fields: image_url,color_1,proportion_1,...color_5,proportion_5
  const obj = { original: r };
  obj.image_url = (r.image_url || '').replace(/^"|"$/g,'');
  obj.colors = [];
  for(let i=1;i<=5;i++){
    const c = (r[`color_${i}`] || '').trim();
    const p = parseFloat(r[`proportion_${i}`]) || 0;
    if(c) obj.colors.push({hex: normalizeHex(c), proportion:p});
  }
  return obj;
}

function normalizeHex(h){
  if(!h) return '';
  h = h.trim();
  if(h[0] !== '#') h = '#'+h;
  if(h.length===4){ // #rgb -> expand
    h = '#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
  }
  return h.toLowerCase();
}

function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const total = filtered.length;
  const start = page*perPage;
  const end = Math.min(total, start+perPage);
  const slice = filtered.slice(start,end);
  slice.forEach((row, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    const img = document.createElement('img');
    img.className = 'thumb';
    img.loading = 'lazy';
    img.src = row.image_url;
    img.alt = `img-${start+idx}`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const swatchWrap = document.createElement('div');
    swatchWrap.className = 'swatches';
    row.colors.slice(0,5).forEach(c=>{
      const s = document.createElement('div');
      s.className = 'swatch';
      s.style.background = c.hex;
      s.title = `${c.hex} (${Math.round(c.proportion*100)}%)`;
      swatchWrap.appendChild(s);
    });
    meta.appendChild(swatchWrap);


    card.appendChild(img);
    card.appendChild(meta);
    card.addEventListener('click', ()=>openModal(row));
    grid.appendChild(card);
  });
  document.getElementById('pageInfo').textContent = `Page ${page+1} — showing ${start+1}-${end} of ${total}`;
}

function applyFilters(){
  const clr = normalizeHex(document.getElementById('colorPicker').value || '');
  const tol = parseInt(document.getElementById('tolerance').value || 60);
  const clr2 = normalizeHex((document.getElementById('colorPicker2') && document.getElementById('colorPicker2').value) || '');
  const colorName = document.getElementById('colorNameFilter').value || '';
  const searchHex = normalizeHex(document.getElementById('searchHex').value || '');
  // filter logic: if searchHex provided, match any color hex exact or very close
  // When filtering, compute a matchScore per row representing the proportion of the best-matching
  // color for the active filter. We'll use this to sort results so the strongest matches appear first.
  filtered = rows.map(r=>{
    let matchScore = 0; // proportion (0..1)

    // compute matchScore depending on which filters are active
    if(searchHex){
      let best = 0;
      r.colors.forEach(c=>{
        if(colorDistance(hexToRgb(c.hex), hexToRgb(searchHex)) <= 24){
          if(c.proportion > best) best = c.proportion;
        }
      });
      matchScore = best;
    }
    // two color pickers -> require both and combine proportions
    else if(clr && clr2){
      let best1 = 0, best2 = 0;
      r.colors.forEach(c=>{
        if(colorDistance(hexToRgb(c.hex), hexToRgb(clr)) <= tol){ if(c.proportion > best1) best1 = c.proportion; }
        if(colorDistance(hexToRgb(c.hex), hexToRgb(clr2)) <= tol){ if(c.proportion > best2) best2 = c.proportion; }
      });
      // combine both proportions as the match score (sum)
      matchScore = best1 + best2;
    }
    // single color picker
    else if(clr){
      let best = 0;
      r.colors.forEach(c=>{
        if(colorDistance(hexToRgb(c.hex), hexToRgb(clr)) <= tol){
          if(c.proportion > best) best = c.proportion;
        }
      });
      matchScore = best;
    }
    // color name used -> match by name (unchanged)
    else if(colorName){
      let best = 0;
      r.colors.forEach(c=>{
        if(colorNameFromHex(c.hex) === colorName){
          if(c.proportion > best) best = c.proportion;
        }
      });
      matchScore = best;
    }

    return Object.assign({}, r, { matchScore });
  }).filter(r=>{
    // Now filter rows out if they don't meet selected filters (we still need to enforce presence)
    // color picker filter (single)
    if(clr && !clr2){
      const found = r.colors && r.colors.some(c=> colorDistance(hexToRgb(c.hex), hexToRgb(clr)) <= tol);
      if(!found) return false;
    }
    // both color pickers -> require both colors found (use same tol for both)
    if(clr && clr2){
      const found1 = r.colors && r.colors.some(c=> colorDistance(hexToRgb(c.hex), hexToRgb(clr)) <= tol);
      const found2 = r.colors && r.colors.some(c=> colorDistance(hexToRgb(c.hex), hexToRgb(clr2)) <= tol);
      if(!found1 || !found2) return false;
    }
    // color name filter
    if(colorName){
      const found = r.colors && r.colors.some(c=> colorNameFromHex(c.hex) === colorName);
      if(!found) return false;
    }
    // search hex
    if(searchHex){
      const found = r.colors && r.colors.some(c=> colorDistance(hexToRgb(c.hex), hexToRgb(searchHex)) <= 24);
      if(!found) return false;
    }
    return true;
  });

  // If any of the filters that imply a target color are active, sort by matchScore desc so strongest matches come first.
  if(searchHex || clr || colorName){
    filtered.sort((a,b)=> (b.matchScore || 0) - (a.matchScore || 0));
  }
  page = 0;
  renderGrid();
}

function openModal(row){
  document.getElementById('modalImage').src = row.image_url;
  const details = document.getElementById('modalDetails');
  details.innerHTML = '';
  row.colors.forEach(c=>{
    const dr = document.createElement('div');
    dr.className = 'detail-row';
    const sw = document.createElement('div');
    sw.className = 'detail-swatch';
    sw.style.background = c.hex;
    const span = document.createElement('div');
    span.innerHTML = `<strong>${c.hex}</strong> — ${Math.round(c.proportion*100)}%`;
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', ()=>{ navigator.clipboard?.writeText(c.hex); });
    dr.appendChild(sw);
    dr.appendChild(span);
    dr.appendChild(copyBtn);
    details.appendChild(dr);
  });
  // add full JSON download
  const dl = document.createElement('button');
  dl.textContent = 'Download JSON';
  dl.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(row, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'row.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  details.appendChild(dl);

  document.getElementById('modal').classList.remove('hidden');
}
function closeModal(){
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalImage').src = '';
}

// color helpers
function hexToRgb(hex){
  if(!hex) return {r:0,g:0,b:0};
  hex = hex.replace('#','');
  if(hex.length===3) hex = hex.split('').map(ch=>ch+ch).join('');
  const n = parseInt(hex,16);
  return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
}

function colorDistance(a,b){
  // simple RGB Euclidean distance
  const dr = a.r-b.r, dg=a.g-b.g, db=a.b-b.b;
  return Math.sqrt(dr*dr+dg*dg+db*db);
}

function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s = l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return {h: h*360, s, l};
}

function colorNameFromHex(hex){
  // map HSL hue ranges to simple color names
  const {r,g,b} = hexToRgb(hex);
  const hsl = rgbToHsl(r,g,b);
  const h = hsl.h;
  const l = hsl.l;
  const s = hsl.s;
  if(l < 0.12) return 'black';
  if(l > 0.92) return 'white';
  if(s < 0.12) return 'gray';
  if(h >= 345 || h < 15) return 'red';
  if(h >= 15 && h < 45) return 'orange';
  if(h >= 45 && h < 75) return 'yellow';
  if(h >= 75 && h < 165) return 'green';
  if(h >= 165 && h < 195) return 'cyan';
  if(h >= 195 && h < 255) return 'blue';
  if(h >= 255 && h < 285) return 'purple';
  if(h >= 285 && h < 330) return 'magenta';
  return 'pink';
}
