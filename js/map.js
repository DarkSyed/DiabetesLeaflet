// Initialize the map centered on the United States
const map = L.map('map').setView([37.8, -96], 4);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Variables to store data
let geojsonLayer;
let nationalData;
let currentYear = 2020; // Default year to display

// Define color function for diabetes prevalence
function getColor(d) {
    return d > 16 ? '#800026' :
           d > 14 ? '#BD0026' :
           d > 12 ? '#E31A1C' :
           d > 10 ? '#FC4E2A' :
           d > 8  ? '#FD8D3C' :
           d > 6  ? '#FEB24C' :
           d > 4  ? '#FED976' :
                    '#FFEDA0';
}

// Define style function for GeoJSON features based on the selected year
function style(feature) {
    // Find the diabetes value for the current year
    const yearData = feature.properties.diabetes.find(d => d.year === currentYear);
    const diabetesValue = yearData ? yearData.value : 0;
    
    return {
        fillColor: getColor(diabetesValue),
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// Add interaction: highlight feature on hover
function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 2,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.9
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

    // Loop through our density intervals and generate a label with a colored square for each interval
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '%<br>' : '%+');
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

// Load GeoJSON data with accurate state boundaries
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
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        
        // If loading fails, display a message on the map
        const errorMsg = L.DomUtil.create('div', 'error-message');
        errorMsg.innerHTML = '<h3>Error Loading Data</h3><p>Could not load the diabetes data. Please check your connection and try again.</p>';
        document.getElementById('map').appendChild(errorMsg);
    });
