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
}

document.getElementById('tolerance').addEventListener('input', function() {
    document.getElementById('tolValue').textContent = this.value;
});

document.getElementById('filterBtn').addEventListener('click', filter);
document.getElementById('clearBtn').addEventListener('click', clearFilters);

function filter() {
    const pickedColor = document.getElementById('colorPicker').value;
    const minPercent = parseFloat(document.getElementById('minPercent').value) / 100;
    const tolerance = parseInt(document.getElementById('tolerance').value);
    const excludeStr = document.getElementById('excludeColors').value.toLowerCase();
    const excludeColors = excludeStr.split(',').map(s => s.trim()).filter(s => s);
    const dominantOnly = document.getElementById('dominantOnly').checked;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    Object.keys(groupedData).forEach(filename => {
        const item = groupedData[filename];
        let colorsToCheck = item.colors;
        if (dominantOnly) {
            colorsToCheck = [colorsToCheck.reduce((max, c) => c.frequency > max.frequency ? c : max)];
        }

        // Check if has the picked color with min percent
        let hasPicked = false;
        for (const color of colorsToCheck) {
            const dist = chroma.distance(pickedColor, color.hex);
            if (dist <= tolerance && color.frequency >= minPercent) {
                hasPicked = true;
                break;
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
            div.innerHTML = `
                <img src="${item.metadata.image_url}" alt="${item.metadata.name}">
                <p>${item.metadata.name}</p>
                <p>${item.metadata.office} - ${item.metadata.party}</p>
                <div class="palette">
                    ${item.colors.map(c => `<div class="color" style="background-color: ${c.hex};" title="${c.hex} (${(c.frequency*100).toFixed(1)}%)"></div>`).join('')}
                </div>
            `;
            resultsDiv.appendChild(div);
        }
    });
}

function clearFilters() {
    document.getElementById('colorPicker').value = '#ff0000';
    document.getElementById('minPercent').value = 10;
    document.getElementById('tolerance').value = 20;
    document.getElementById('tolValue').textContent = 20;
    document.getElementById('excludeColors').value = '';
    document.getElementById('dominantOnly').checked = false;
    document.getElementById('results').innerHTML = '';
}