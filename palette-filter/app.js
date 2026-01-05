let data = [];
let groupedData = {};

Papa.parse('../data/pylette_metadata.csv', {
    download: true,
    header: true,
    complete: function(results) {
        data = results.data;

        groupData();
    }
});

function groupData() {
    groupedData = {};
    data.forEach(row => {
        const filename = row.filename;
        if (!groupedData[filename]) {
            groupedData[filename] = {
                colors: [],
                metadata: {
                    image_url: row.image_url,
                    name: row.name,
                    office: row.office,
                    party: row.party,
                    date_int: row.date_int
                }
            };
        }
        groupedData[filename].colors.push({
            frequency: parseFloat(row.frequency),
            hex: row.hex,
            r: parseInt(row.R),
            g: parseInt(row.G),
            b: parseInt(row.B)
        });
    });
    
    // Show all items on initial load
    filter();
}

document.getElementById('tolerance').addEventListener('input', function() {
    document.getElementById('tolValue').textContent = this.value;
});

document.getElementById('searchInput').addEventListener('input', filter);
document.getElementById('colorPicker').addEventListener('input', function() {
    syncHexInput();
    filter();
});
document.getElementById('hexInput').addEventListener('input', function() {
    syncColorPicker();
    filter();
});
document.getElementById('minPercent').addEventListener('input', filter);
document.getElementById('tolerance').addEventListener('input', filter);
document.getElementById('excludeColors').addEventListener('input', filter);
document.getElementById('dominantOnly').addEventListener('change', filter);
document.getElementById('clearBtn').addEventListener('click', clearFilters);

function syncHexInput() {
    const colorPicker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hexInput');
    hexInput.value = colorPicker.value;
}

function syncColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hexInput');
    const hexValue = hexInput.value;
    
    // Validate hex format
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
        colorPicker.value = hexValue;
    }
}

function filter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const pickedColor = document.getElementById('colorPicker').value;
    const minPercent = parseFloat(document.getElementById('minPercent').value) / 100;
    const tolerance = parseInt(document.getElementById('tolerance').value);
    const excludeStr = document.getElementById('excludeColors').value.toLowerCase();
    const excludeColors = excludeStr.split(',').map(s => s.trim()).filter(s => s);
    const dominantOnly = document.getElementById('dominantOnly').checked;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    let resultCount = 0;

    Object.keys(groupedData).forEach(filename => {
        const item = groupedData[filename];
        
        // Check search term
        const matchesSearch = !searchTerm || 
            item.metadata.name.toLowerCase().includes(searchTerm) || 
            filename.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return;
        
        let colorsToCheck = item.colors;
        if (dominantOnly) {
            colorsToCheck = [colorsToCheck.reduce((max, c) => c.frequency > max.frequency ? c : max)];
        }

        // Check if has the picked color with min percent
        // Skip color filtering if white is selected (default "show all" mode)
        let hasPicked = true;
        if (pickedColor !== '#ffffff') {
            hasPicked = false;
            for (const color of colorsToCheck) {
                const dist = chroma.distance(pickedColor, color.hex);
                if (dist <= tolerance && color.frequency >= minPercent) {
                    hasPicked = true;
                    break;
                }
            }
        }

        // Check exclude
        let hasExcluded = false;
        for (const color of colorsToCheck) {
            const name = chroma(color.hex).name().toLowerCase();
            if (excludeColors.includes(name)) {
                hasExcluded = true;
                break;
            }
        }

        if (hasPicked && !hasExcluded) {
            // Display
            const div = document.createElement('div');
            div.className = 'item';
            const img = document.createElement('img');
            img.src = item.metadata.image_url;
            img.alt = item.metadata.name;
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => showPaletteModal(filename));
            div.appendChild(img);
            
            const p1 = document.createElement('p');
            p1.textContent = item.metadata.name;
            div.appendChild(p1);
            
            const p2 = document.createElement('p');
            p2.textContent = `${item.metadata.office} - ${item.metadata.party}`;
            div.appendChild(p2);
            
            const paletteDiv = document.createElement('div');
            paletteDiv.className = 'palette';
            item.colors.forEach(c => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'color';
                colorDiv.style.backgroundColor = c.hex;
                colorDiv.title = `${c.hex} (${(c.frequency*100).toFixed(1)}%)`;
                paletteDiv.appendChild(colorDiv);
            });
            div.appendChild(paletteDiv);
            
            resultsDiv.appendChild(div);
            resultCount++;
        }
    });

    // Update results counter
    const counterEl = document.getElementById('resultsCounter');
    counterEl.textContent = `Showing ${resultCount} result${resultCount !== 1 ? 's' : ''}`;
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('colorPicker').value = '#ffffff';
    document.getElementById('hexInput').value = '#ffffff';
    document.getElementById('minPercent').value = 10;
    document.getElementById('tolerance').value = 60;
    document.getElementById('tolValue').textContent = 60;
    document.getElementById('excludeColors').value = '';
    document.getElementById('dominantOnly').checked = false;
    document.getElementById('results').innerHTML = '';
    document.getElementById('resultsCounter').textContent = 'Showing 0 results';
    
    // Show all results after clearing filters
    filter();
}

function showPaletteModal(filename) {
    const item = groupedData[filename];
    const modal = document.getElementById('paletteModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>Color Palette for ${filename}</h2>
        <img src="${item.metadata.image_url}" alt="${item.metadata.name}" style="max-width: 200px; height: auto;">
        <p><strong>Name:</strong> ${item.metadata.name}</p>
        <p><strong>Office:</strong> ${item.metadata.office} | <strong>Party:</strong> ${item.metadata.party} | <strong>Year:</strong> ${item.metadata.date_int || 'N/A'}</p>
        
        <div class="palette-bar">
            ${item.colors.map(c => `<div class="color-segment" style="background-color: ${c.hex}; width: ${(c.frequency * 100).toFixed(2)}%;">${c.hex}</div>`).join('')}
        </div>
        
        <div class="color-info">
            <h3>Color Details</h3>
            ${item.colors.map(c => `
                <div class="color-item">
                    <div class="color-swatch" style="background-color: ${c.hex};"></div>
                    <div class="color-details">
                        <div class="percentage">${(c.frequency * 100).toFixed(2)}%</div>
                        <div>Hex: ${c.hex} | RGB: ${c.r}, ${c.g}, ${c.b}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Modal close functionality
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('paletteModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('paletteModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});