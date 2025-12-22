// app.js — loads data/colors_output.csv, renders grid, filters by color hex and color name


const CSV_PATH = '../data/colors_output_local.csv';
let data = [];
let filtered = [];
let page = 0;
let perPage = 60;

// store last filter values for each mode
let lastColor = '#ff0000';
let lastColor2 = '#0000ff';
let lastTolerance = 100;
let lastColorName = '';
let lastHex = '';

document.addEventListener('DOMContentLoaded', () => {
  hookControls();
  loadCSV();
});

function hookControls(){
  document.getElementById('tolerance').addEventListener('input', (e)=>{
    document.getElementById('tolValue').textContent = e.target.value;
    applyFilters();
  });
  document.getElementById('colorPicker').addEventListener('input', applyFilters);
  document.getElementById('colorPicker2').addEventListener('input', applyFilters);
  document.getElementById('colorNameFilter').addEventListener('change', applyFilters);
  document.getElementById('searchHex').addEventListener('input', applyFilters);
  document.getElementById('toggleSecondColor').addEventListener('click', toggleSecondColor);
  // filter mode radios
  document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
    radio.addEventListener('change', switchFilterMode);
  });
  document.getElementById('clearFilters').addEventListener('click', ()=>{
    document.getElementById('colorPicker').value = '#ff0000';
    document.getElementById('colorPicker2').value = '#0000ff';
    document.getElementById('colorNameFilter').value = '';
    document.getElementById('searchHex').value = '';
    document.getElementById('tolerance').value = 100;
    document.getElementById('tolValue').textContent = 100;
    // hide second color if shown
    document.getElementById('colorPicker2').style.display = 'none';
    document.getElementById('toggleSecondColor').textContent = 'Add Second Color';
    // reset last values
    lastColor = '#ff0000';
    lastColor2 = '#0000ff';
    lastTolerance = 100;
    lastColorName = '';
    lastHex = '';
    applyFilters();
  });
  document.getElementById('perPage').addEventListener('change',(e)=>{ perPage = parseInt(e.target.value); renderGrid(); });
  document.getElementById('prevPage').addEventListener('click', ()=>{ if(page>0) {page--; renderGrid()} });
  document.getElementById('nextPage').addEventListener('click', ()=>{ if((page+1)*perPage < filtered.length) {page++; renderGrid()} });
  document.getElementById('closeModal').addEventListener('click', closeModal);
}

function toggleSecondColor(){
  const picker2 = document.getElementById('colorPicker2');
  const btn = document.getElementById('toggleSecondColor');
  if(picker2.style.display === 'none'){
    picker2.style.display = 'inline';
    btn.textContent = 'Remove Second Color';
  } else {
    picker2.style.display = 'none';
    btn.textContent = 'Add Second Color';
  }
}

function switchFilterMode(){
  const mode = document.querySelector('input[name="filterMode"]:checked').value;
  document.getElementById('colorControls').style.display = mode === 'color' ? 'block' : 'none';
  document.getElementById('nameControls').style.display = mode === 'name' ? 'block' : 'none';
  document.getElementById('hexControls').style.display = mode === 'hex' ? 'block' : 'none';
  // set inputs to last values for this mode
  if(mode === 'color'){
    document.getElementById('colorPicker').value = lastColor;
    document.getElementById('colorPicker2').value = lastColor2;
    document.getElementById('tolerance').value = lastTolerance;
    document.getElementById('tolValue').textContent = lastTolerance;
    // hide second if not set
    if(document.getElementById('colorPicker2').style.display === 'none' && lastColor2 !== '#0000ff'){ // if was added
      // assume if lastColor2 is not default, it was added
      document.getElementById('colorPicker2').style.display = 'inline';
      document.getElementById('toggleSecondColor').textContent = 'Remove Second Color';
    }
  } else if(mode === 'name'){
    document.getElementById('colorNameFilter').value = lastColorName;
  } else if(mode === 'hex'){
    document.getElementById('searchHex').value = lastHex;
  }
  // apply the filter
  applyFilters();
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
  const mode = document.querySelector('input[name="filterMode"]:checked').value;
  const clr = normalizeHex(document.getElementById('colorPicker').value || '');
  const tol = parseInt(document.getElementById('tolerance').value || 100);
  const clr2 = normalizeHex((document.getElementById('colorPicker2') && document.getElementById('colorPicker2').value) || '');
  const colorName = document.getElementById('colorNameFilter').value || '';
  const searchHex = normalizeHex(document.getElementById('searchHex').value || '');
  // update last values
  if(mode === 'color'){
    lastColor = document.getElementById('colorPicker').value;
    lastColor2 = document.getElementById('colorPicker2').value;
    lastTolerance = tol;
  } else if(mode === 'name'){
    lastColorName = colorName;
  } else if(mode === 'hex'){
    lastHex = document.getElementById('searchHex').value;
  }
  // filter logic based on mode
  filtered = rows.map(r=>{
    let matchScore = 0; // proportion (0..1)

    if(mode === 'hex' && searchHex){
      let best = 0;
      r.colors.forEach(c=>{
        if(colorDistance(hexToRgb(c.hex), hexToRgb(searchHex)) <= 24){
          if(c.proportion > best) best = c.proportion;
        }
      });
      matchScore = best;
    }
    else if(mode === 'color'){
      // two color pickers -> require both and combine proportions
      if(clr && clr2){
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
    }
    // color name used -> match by name
    else if(mode === 'name' && colorName){
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
    // Now filter rows out if they don't meet selected filters based on mode
    if(mode === 'color'){
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
    }
    // color name filter
    else if(mode === 'name' && colorName){
      const found = r.colors && r.colors.some(c=> colorNameFromHex(c.hex) === colorName);
      if(!found) return false;
    }
    // search hex
    else if(mode === 'hex' && searchHex){
      const found = r.colors && r.colors.some(c=> colorDistance(hexToRgb(c.hex), hexToRgb(searchHex)) <= 24);
      if(!found) return false;
    }
    return true;
  });

  // If any of the filters that imply a target color are active, sort by matchScore desc so strongest matches come first.
  if((mode === 'hex' && searchHex) || (mode === 'color' && clr) || (mode === 'name' && colorName)){
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
