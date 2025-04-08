// Define base maps
const baseMaps = {
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }),
    "Esri WorldImagery": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, GeoEye, Aerogrid',
        maxZoom: 18
    }),
    "Carto Positron": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }),
    "Carto DarkMatter": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions"></a>',
        subdomains: 'abcd',
        maxZoom: 19
    })
};

// Initialize the map centered on the United States with layer control
const map = L.map('map', {
    attributionControl: true,
    layers: [baseMaps["Carto Positron"]] // Default base map
}).setView([37.8, -96], 4);

// Add layer control to switch between base maps
L.control.layers(baseMaps, null, {position: 'topright'}).addTo(map);

// Make sure the map has attribution control enabled
map.attributionControl.setPosition('bottomright');

// Variables to store data
let geojsonLayer;
let nationalData;
let currentYear = 2020; // Default year to display

// Define color function for diabetes prevalence with a more modern palette
function getColor(d) {
    return d > 16 ? '#3A1C71' :  // deep purple
           d > 14 ? '#4B36D1' :  // medium purple
           d > 12 ? '#5560E9' :  // blue-purple
           d > 10 ? '#5E8BEF' :  // light blue
           d > 8  ? '#66B3F3' :  // sky blue
           d > 6  ? '#72D8F7' :  // light cyan
           d > 4  ? '#7FFFD4' :  // aquamarine
                    '#E0FFFF';   // light cyan
    
    // Alternative warm palette:
    // return d > 16 ? '#7F0000' :  // dark red
    //       d > 14 ? '#B71C1C' :  // red
    //       d > 12 ? '#D32F2F' :  // lighter red
    //       d > 10 ? '#F44336' :  // tomato
    //       d > 8  ? '#FF5722' :  // deep orange
    //       d > 6  ? '#FF9800' :  // orange
    //       d > 4  ? '#FFC107' :  // amber
    //                '#FFEB3B';   // yellow
}

// Define style function for GeoJSON features based on the selected year
function style(feature) {
    // Find the diabetes value for the current year
    const yearData = feature.properties.diabetes.find(d => d.year === currentYear);
    const diabetesValue = yearData ? yearData.value : 0;
    
    return {
        fillColor: getColor(diabetesValue),
        weight: 1.5,  // slightly thicker borders
        opacity: 1,
        color: 'black',  // black borders instead of white
        dashArray: '', // solid line instead of dashed
        fillOpacity: 0.8  // slightly more opaque
    };
}

// Add interaction: highlight feature on hover
function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 3,
        color: '#333',
        dashArray: '',
        fillOpacity: 0.9,
        // Add subtle shadow effect when hovering
        className: 'state-hover'
    });

    layer.bringToFront();
    info.update(layer.feature.properties);
    updateTable(layer.feature.properties);
}

// Reset highlight on mouseout
function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    info.update();
}

// Zoom to feature on click
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// Set listeners on state layer
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// Create custom info control
const info = L.control();

info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function(props) {
    if (props) {
        const yearData = props.diabetes.find(d => d.year === currentYear);
        const diabetesValue = yearData ? yearData.value.toFixed(1) : 'N/A';
        
        this._div.innerHTML = '<h4>US Diabetes Prevalence</h4>' +
            '<b>' + props.NAME + '</b><br />' +
            diabetesValue + '% of adults in ' + currentYear;
    } else {
        this._div.innerHTML = '<h4>US Diabetes Prevalence</h4>' +
            'Hover over a state';
    }
};

info.addTo(map);

// Create legend
const legend = L.control({position: 'bottomright'});

legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    const grades = [0, 4, 6, 8, 10, 12, 14, 16];
    const labels = [];

    // Add a legend title
    div.innerHTML = '<h4>Diabetes Prevalence (%)</h4>';

    // Loop through our density intervals and generate a label with a colored square for each interval
    for (let i = 0; i < grades.length; i++) {
        const from = grades[i];
        const to = grades[i + 1];
        
        div.innerHTML +=
            '<div class="legend-item">' +
            '<i style="background:' + getColor(from + 1) + '"></i> ' +
            from + (to ? '&ndash;' + to : '+') + '%' +
            '</div>';
    }

    return div;
};

legend.addTo(map);

// Function to update the table with state data
function updateTable(props) {
    const table = document.getElementById('diabetesTable');
    
    // Clear existing rows except header
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    if (props) {
        // Add a row for each year of data
        props.diabetes.forEach(yearData => {
            const row = table.insertRow();
            
            const stateCell = row.insertCell(0);
            const yearCell = row.insertCell(1);
            const valueCell = row.insertCell(2);
            
            stateCell.textContent = props.NAME;
            yearCell.textContent = yearData.year;
            valueCell.textContent = yearData.value.toFixed(1);
            
            // Highlight the current year
            if (yearData.year === currentYear) {
                row.style.backgroundColor = '#e6f7ff';
                row.style.fontWeight = 'bold';
            }
        });
    }
}

// Function to update national statistics
function updateNationalStats() {
    if (nationalData) {
        const yearData = nationalData.find(d => d.Year == currentYear);
        if (yearData) {
            document.getElementById('nationalRate').textContent = yearData.Percentage + '%';
            document.getElementById('nationalRange').textContent = 
                yearData.LowerLimit + '% - ' + yearData.UpperLimit + '%';
        }
    }
}

// Function to update the map based on the selected year
function updateMap() {
    document.getElementById('yearDisplay').textContent = currentYear;
    
    if (geojsonLayer) {
        geojsonLayer.setStyle(style);
        info.update();
    }
    
    updateNationalStats();
}

// Set up the year slider
const yearSlider = document.getElementById('yearSlider');
yearSlider.addEventListener('input', function() {
    currentYear = parseInt(this.value);
    updateMap();
});

// Load the national data
fetch('data/temporal/diabetes_prevalence_by_year.csv')
    .then(response => response.text())
    .then(csvText => {
        // Parse CSV
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        nationalData = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',');
            const entry = {};
            
            for (let j = 0; j < headers.length; j++) {
                entry[headers[j]] = values[j];
            }
            
            nationalData.push(entry);
        }
        
        updateNationalStats();
    })
    .catch(error => {
        console.error('Error loading national data:', error);
    });

// Add a loading indicator
function showLoader() {
    const loaderDiv = L.DomUtil.create('div', 'map-loader');
    loaderDiv.id = 'map-loader';
    loaderDiv.innerHTML = '<div class="spinner"></div><p>Loading data...</p>';
    document.getElementById('map').appendChild(loaderDiv);
}

function hideLoader() {
    const loader = document.getElementById('map-loader');
    if (loader) {
        loader.remove();
    }
}

// Load GeoJSON data with accurate state boundaries
showLoader(); // Show loader before fetch
fetch('data/merged_diabetes_states.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('GeoJSON data not available');
        }
        return response.json();
    })
    .then(data => {
        // Add GeoJSON layer to the map
        geojsonLayer = L.geoJSON(data, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        // Initial update
        updateMap();
        hideLoader(); // Hide loader after successful load
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        hideLoader(); // Hide loader on error
        
        // If loading fails, display a message on the map
        const errorMsg = L.DomUtil.create('div', 'error-message');
        errorMsg.innerHTML = '<h3>Error Loading Data</h3><p>Could not load the diabetes data. Please check your connection and try again.</p>';
        document.getElementById('map').appendChild(errorMsg);
    });

// Update the explore data button functionality to hide the map header
document.getElementById('exploreDataBtn').addEventListener('click', function() {
    const infoPanel = document.getElementById('info');
    const dataTable = document.getElementById('diabetesTable');
    const mapHeader = document.querySelector('.map-header');
    
    // Hide the map header when clicking explore data
    mapHeader.classList.add('hidden');
    
    // Check if we're on mobile (using the same breakpoint as in CSS)
    if (window.innerWidth <= 768) {
        // On mobile, toggle the info panel visibility
        if (infoPanel.style.display === 'none') {
            // Show the info panel
            infoPanel.style.display = 'flex';
            this.textContent = 'Hide Data';
            
            // Scroll to ensure the info panel is visible
            infoPanel.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Hide the info panel
            infoPanel.style.display = 'none';
            this.textContent = 'Explore the Data';
            
            // Show the map header again when hiding the data panel on mobile
            mapHeader.classList.remove('hidden');
        }
    } else {
        // On desktop, highlight the data table with an animation
        dataTable.classList.add('highlight-table');
        
        // Scroll the info panel to show the table
        dataTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Remove the highlight after the animation completes
        setTimeout(() => {
            dataTable.classList.remove('highlight-table');
        }, 2000);
        
        // Also fill the table with all states' data for the current year
        if (geojsonLayer) {
            fillTableWithAllStates();
        }
    }
});

// Function to populate the table with all states' data for the current year
function fillTableWithAllStates() {
    const table = document.getElementById('diabetesTable');
    
    // Clear existing rows except header
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // Add a row for each state's current year data
    if (geojsonLayer) {
        const states = [];
        
        // Collect all states' data
        geojsonLayer.eachLayer(function(layer) {
            const props = layer.feature.properties;
            const yearData = props.diabetes.find(d => d.year === currentYear);
            
            if (yearData) {
                states.push({
                    name: props.NAME,
                    value: yearData.value
                });
            }
        });
        
        // Sort states by diabetes value (descending)
        states.sort((a, b) => b.value - a.value);
        
        // Add rows to the table
        states.forEach(state => {
            const row = table.insertRow();
            
            const stateCell = row.insertCell(0);
            const yearCell = row.insertCell(1);
            const valueCell = row.insertCell(2);
            
            stateCell.textContent = state.name;
            yearCell.textContent = currentYear;
            valueCell.textContent = state.value.toFixed(1);
        });
        
        // Add a heading above the table
        const tableCaption = document.getElementById('tableCaption');
        if (!tableCaption) {
            const caption = document.createElement('div');
            caption.id = 'tableCaption';
            caption.className = 'table-caption';
            caption.innerHTML = `<h4>All States (${currentYear})</h4><p>Sorted by diabetes prevalence</p>`;
            table.parentNode.insertBefore(caption, table);
        } else {
            tableCaption.innerHTML = `<h4>All States (${currentYear})</h4><p>Sorted by diabetes prevalence</p>`;
        }
    }
}

// Add back to map button functionality
document.getElementById('backToMapBtn').addEventListener('click', function() {
    const mapHeader = document.querySelector('.map-header');
    
    // Show the map header again
    mapHeader.classList.remove('hidden');
    
    // On mobile, possibly hide the info panel
    if (window.innerWidth <= 768) {
        const infoPanel = document.getElementById('info');
        infoPanel.style.display = 'none';
        document.getElementById('exploreDataBtn').textContent = 'Explore the Data';
    }
});
