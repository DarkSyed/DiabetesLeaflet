// Enhanced map.js with county-level data support
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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
let countyLayer;
let nationalData;
let currentYear = 2020; // Default year to display
let currentView = 'state'; // Default view (state or county)

// Define color function for diabetes prevalence with a more modern palette
function getColor(d) {
    return d > 16 ? '#3A1C71' : // deep purple
           d > 14 ? '#4B36D1' : // medium purple
           d > 12 ? '#5560E9' : // blue-purple
           d > 10 ? '#5E8BEF' : // light blue
           d > 8  ? '#66B3F3' : // sky blue
           d > 6  ? '#72D8F7' : // light cyan
           d > 4  ? '#7FFFD4' : // aquamarine
                    '#E0FFFF';   // light cyan
}

// Define style function for GeoJSON features based on the selected year
function style(feature) {
    const yearData = feature.properties.diabetes.find(d => d.year === currentYear);
    const diabetesValue = yearData ? yearData.value : 0;

    return {
        fillColor: getColor(diabetesValue),
        weight: 0.4,           // Much thinner borders to start with (reduced from 0.8)
        opacity: 1,
        color: 'black',        // Keep black borders
        dashArray: '',
        fillOpacity: 0.85,
        smoothFactor: 0.5
    };
}

// Add interaction: highlight feature on hover
function highlightFeature(e) {
    const layer = e.target;

    // Better highlight styling
    layer.setStyle({
        weight: 3,
        color: '#333',         // Darker shade when highlighted
        dashArray: '',
        fillOpacity: 0.9,
    });

    // Fix for IE/Edge not bringing feature to front properly
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    
    info.update(layer.feature.properties);
    
    if (currentView === 'state') {
        updateTable(layer.feature.properties);
    } else {
        updateCountyTable(layer.feature.properties);
    }
}

// Reset highlight on mouseout
function resetHighlight(e) {
    if (currentView === 'state') {
        geojsonLayer.resetStyle(e.target);
    } else {
        countyLayer.resetStyle(e.target);
    }
    info.update();
}

// Zoom to feature on click
function zoomToFeature(e) {
    try {
        // Special case for Alaska
        if (e.target.feature.properties.NAME === "Alaska") {
            // Custom bounds for Alaska mainland
            map.fitBounds([
                [51.0, -179.0],  // Southwest corner
                [71.5, -130.0]   // Northeast corner
            ]);
        } 
        // Special case for Aleutians West county
        else if (e.target.feature.properties.county === "Aleutians West" || 
                 e.target.feature.properties.NAME === "Aleutians West" ||
                 (e.target.feature.properties.COUNTY === "016" && e.target.feature.properties.STATE === "02")) {
            // Custom bounds for Aleutian Islands
            map.fitBounds([
                [51.0, 172.0],   // Southwest corner
                [55.0, -165.0]   // Northeast corner
            ]);
        }
        else {
            // For other features, use normal bounds
            map.fitBounds(e.target.getBounds());
        }
    } catch (error) {
        // Fallback if the bounds calculation fails
        console.error("Error zooming to feature: ", error);
        map.setView([37.8, -96], 4); // Reset to default US view
    }
}

// Set listeners on feature
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
        if (currentView === 'state') {
            const yearData = props.diabetes.find(d => d.year === currentYear);
            const diabetesValue = yearData ? yearData.value.toFixed(1) : 'N/A';
            
            this._div.innerHTML = '<h4>US Diabetes Prevalence</h4>' +
                '<b>' + props.NAME + '</b><br />' +
                diabetesValue + '% of adults in ' + currentYear;
        } else {
            // County view
            const diabetesValue = props.diabetesPercent ? parseFloat(props.diabetesPercent).toFixed(1) : 'N/A';
            
            this._div.innerHTML = '<h4>US Diabetes Prevalence</h4>' +
                '<b>' + props.county + ', ' + props.state + '</b><br />' +
                diabetesValue + '% of adults';
        }
    } else {
        this._div.innerHTML = '<h4>US Diabetes Prevalence</h4>' +
            'Hover over a ' + (currentView === 'state' ? 'state' : 'county');
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
        div.innerHTML += '<div class="legend-item">' +
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
    
    // Show table caption
    document.getElementById('tableCaption').style.display = 'block';
    document.getElementById('tableCaption').innerHTML = '<h4>State Data</h4><p>' + props.NAME + ' diabetes prevalence over time</p>';
    
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
                row.classList.add('highlighted-row');
            }
        });
    }
}

// Function to update the table with county data
function updateCountyTable(props) {
    const table = document.getElementById('diabetesTable');
    
    // Clear existing rows except header
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // Show table caption
    document.getElementById('tableCaption').style.display = 'block';
    
    if (props && props.county) {
        document.getElementById('tableCaption').innerHTML = '<h4>County Data (2012)</h4><p>' + props.county + ', ' + props.state + ' diabetes statistics</p>';
        
        // Add row for overall diabetes prevalence
        const row1 = table.insertRow();
        row1.classList.add('highlighted-row');
        row1.insertCell(0).textContent = props.county;
        row1.insertCell(1).textContent = 'Overall';
        row1.insertCell(2).textContent = props.diabetesPercent;
        
        // Add row for men's diabetes prevalence
        const row2 = table.insertRow();
        row2.insertCell(0).textContent = props.county;
        row2.insertCell(1).textContent = 'Men';
        row2.insertCell(2).textContent = props.menDiabetesPercent;
        
        // Add row for women's diabetes prevalence
        const row3 = table.insertRow();
        row3.insertCell(0).textContent = props.county;
        row3.insertCell(1).textContent = 'Women';
        row3.insertCell(2).textContent = props.womenDiabetesPercent;
        
        // Add row for obesity prevalence
        if (props.menObesePercent && props.womenObesePercent) {
            const row4 = table.insertRow();
            row4.insertCell(0).textContent = props.county;
            row4.insertCell(1).textContent = 'Obesity (Men)';
            row4.insertCell(2).textContent = props.menObesePercent;
            
            const row5 = table.insertRow();
            row5.insertCell(0).textContent = props.county;
            row5.insertCell(1).textContent = 'Obesity (Women)';
            row5.insertCell(2).textContent = props.womenObesePercent;
        }
    } else {
        document.getElementById('tableCaption').innerHTML = '<h4>County Data (2012)</h4><p>Hover over a county to see details</p>';
    }
}

// Function to update national statistics
function updateNationalStats() {
    if (currentView === 'state') {
        if (nationalData) {
            const yearData = nationalData.find(d => d.Year == currentYear);
            if (yearData) {
                document.getElementById('nationalRate').textContent = yearData.Percentage + '%';
                document.getElementById('nationalRange').textContent = yearData.LowerLimit + '% - ' + yearData.UpperLimit + '%';
            }
            
            // Ensure we remove the county year label when in state view
            const statsTitle = document.querySelector('.national-stats h4');
            if (statsTitle) {
                statsTitle.innerHTML = 'National Statistics';
            }
        }
    } else {
        // County view - calculate from county data
        if (countyLayer) {
            const stats = countyData.getNationalStats(countyLayer.toGeoJSON().features);
            document.getElementById('nationalRate').textContent = stats.average + '%';
            document.getElementById('nationalRange').textContent = stats.range;
            
            // Add year information only in county view
            const statsTitle = document.querySelector('.national-stats h4');
            if (statsTitle) {
                statsTitle.innerHTML = 'National Statistics <span style="font-size:0.85em;font-weight:normal;">(County data: 2012)</span>';
            }
        }
    }
}

// Function to update the map based on the selected year and view
function updateMap() {
    document.getElementById('yearDisplay').textContent = currentYear;
    
    if (currentView === 'state') {
        // Show year slider in state view
        document.getElementById('yearSliderContainer').style.display = 'block';
        
        if (countyLayer && map.hasLayer(countyLayer)) {
            map.removeLayer(countyLayer);
        }
        if (geojsonLayer) {
            if (!map.hasLayer(geojsonLayer)) {
                map.addLayer(geojsonLayer);
            }
            geojsonLayer.setStyle(style);
        }
        // Update view toggle buttons
        document.getElementById('stateViewBtn').classList.add('active');
        document.getElementById('countyViewBtn').classList.remove('active');
        
        // Reset the national stats title when switching to state view
        const statsTitle = document.querySelector('.national-stats h4');
        if (statsTitle) {
            statsTitle.innerHTML = 'National Statistics';
        }
    } else {
        // Hide year slider in county view
        document.getElementById('yearSliderContainer').style.display = 'none';
        
        if (geojsonLayer && map.hasLayer(geojsonLayer)) {
            map.removeLayer(geojsonLayer);
        }
        if (countyLayer) {
            if (!map.hasLayer(countyLayer)) {
                map.addLayer(countyLayer);
            }
        } else {
            loadCountyData();
        }
        // Update view toggle buttons
        document.getElementById('countyViewBtn').classList.add('active');
        document.getElementById('stateViewBtn').classList.remove('active');

        // Add year information to the table caption
        document.getElementById('tableCaption').innerHTML = '<h4>County Data (2012)</h4><p>Hover over a county to see details</p>';
        
        // Update the national stats title for county view
        const statsTitle = document.querySelector('.national-stats h4');
        if (statsTitle) {
            statsTitle.innerHTML = 'National Statistics <span style="font-size:0.85em;font-weight:normal;">(County data: 2012)</span>';
        }
    }
    
    info.update();
    updateNationalStats();
}

// Set up the year slider
const yearSlider = document.getElementById('yearSlider');
yearSlider.addEventListener('input', function() {
    currentYear = parseInt(this.value);
    updateMap();
});

// Set up view toggle buttons
document.getElementById('stateViewBtn').addEventListener('click', function() {
    if (currentView !== 'state') {
        currentView = 'state';
        updateMap();
    }
});

document.getElementById('countyViewBtn').addEventListener('click', function() {
    if (currentView !== 'county') {
        currentView = 'county';
        updateMap();
    }
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

// Load state-level diabetes data
function loadStateData() {
    showLoader();
    
    // First load the diabetes data by state
    fetch('data/temporal/diabetes_by_state_years.geojson')
        .then(response => response.json())
        .then(diabetesData => {
            // Extract the diabetes data
            const diabetesByState = {};
            diabetesData.features.forEach(feature => {
                diabetesByState[feature.properties.NAME] = feature.properties.diabetes;
            });
            
            // Then load the accurate state boundaries
            return fetch('data/us_states_accurate.geojson')
                .then(response => response.json())
                .then(statesData => {
                    // Merge the diabetes data with accurate state boundaries
                    statesData.features.forEach(feature => {
                        const stateName = feature.properties.NAME;
                        if (diabetesByState[stateName]) {
                            feature.properties.diabetes = diabetesByState[stateName];
                        } else {
                            console.warn(`No diabetes data for state: ${stateName}`);
                            // Add placeholder data
                            feature.properties.diabetes = [
                                {"year": 2000, "value": 5.0},
                                {"year": 2005, "value": 6.0},
                                {"year": 2010, "value": 7.0},
                                {"year": 2015, "value": 8.0},
                                {"year": 2020, "value": 9.0}
                            ];
                        }
                    });
                    
                    // Now create the GeoJSON layer with the combined data
                    geojsonLayer = L.geoJSON(statesData, {
                        style: style,
                        onEachFeature: onEachFeature,
                        interactive: true
                    }).addTo(map);
                    
                    hideLoader();
                });
        })
        .catch(error => {
            console.error('Error loading state data:', error);
            hideLoader();
            
            // Display an error message on the map
            const errorMsg = L.DomUtil.create('div', 'error-message');
            errorMsg.innerHTML = '<h3>Error Loading State Data</h3><p>Could not load the diabetes data. Please check your connection and try again.</p>';
            document.getElementById('map').appendChild(errorMsg);
        });
}

// Load county-level diabetes data
async function loadCountyData() {
    showLoader();
    
    try {
        // Use the countyData.js module to load and process the data
        const data = await countyData.loadData();
        
        if (data) {
            countyLayer = L.geoJSON(data, {
                style: countyData.style,
                onEachFeature: onEachFeature
            });
            
            if (currentView === 'county') {
                countyLayer.addTo(map);
            }
            
            updateNationalStats();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading county data:', error);
        hideLoader();
    }
}

// Initialize the map with state data
loadStateData();

// Show the explore data panel when the button is clicked
document.getElementById('exploreDataBtn').addEventListener('click', function() {
    // Only hide the map header, don't modify the info panel
    document.querySelector('.map-header').classList.add('hidden');
});

// Hide the explore data panel when the back button is clicked
document.getElementById('backToMapBtn').addEventListener('click', function() {
    // Only show the map header, don't modify the info panel
    document.querySelector('.map-header').classList.remove('hidden');
});

// Enhancement for better polygon rendering - replace existing map options
if (map) {
    // Set key options for proper polygon rendering
    map.options.preferCanvas = false; // SVG often renders borders better than canvas
    if (L.Browser.mobile) {
        map.options.renderer = L.canvas({ padding: 1.0 });
    } else {
        map.options.renderer = L.svg({ padding: 1.0 }); // SVG renderer for sharper state borders
    }
    
    // Disable animations which can sometimes distort shapes
    map._zoomAnimated = false;
    
    // Set proper zoom to see the full US clearly
    map.setView([37.8, -96], 4);
    
    // Adjust min/max zoom for better visibility
    map.options.minZoom = 3;
    map.options.maxZoom = 10;
}

// Add zoom handler to adjust border weight
map.on('zoomend', function() {
    const currentZoom = map.getZoom();
    // Scale from 0.4 to 1.2 based on zoom (lower range than before)
    const newWeight = Math.min(0.4 + (currentZoom - 4) * 0.15, 1.2);
    
    if (geojsonLayer) {
        geojsonLayer.setStyle({
            weight: newWeight
        });
    }
    
    if (countyLayer && map.hasLayer(countyLayer)) {
        countyLayer.setStyle({
            weight: Math.max(0.2, newWeight * 0.6) // Even thinner for counties
        });
    }
});

// Also update countyData.js style function by updating the initial countyData.style:
countyData.style = function(feature) {
    const diabetesValue = feature.properties.diabetesPercent ? parseFloat(feature.properties.diabetesPercent) : 0;
    
    return {
        fillColor: this.getColor(diabetesValue),
        weight: 0.4,          // Thinner borders for counties (reduced from 0.8)
        opacity: 1,
        color: 'black',
        dashArray: '',
        fillOpacity: 0.85,
        smoothFactor: 0.5
    };
};
