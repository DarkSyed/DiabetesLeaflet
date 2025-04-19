// Ensure the original visualization style is maintained while incorporating county data
// This file modifies the enhanced_map.js to maintain the original styling

// Update the style function for county features to match the state styling
countyData.style = function(feature) {
    const diabetesValue = feature.properties.diabetesPercent ? parseFloat(feature.properties.diabetesPercent) : 0;
    
    return {
        fillColor: getColor(diabetesValue),
        weight: 1.5, // same as state borders
        opacity: 1,
        color: 'black',  // black borders to match state view
        dashArray: '',   // solid line instead of dashed
        fillOpacity: 0.8 // same opacity as state view
    };
};

// Ensure consistent hover effects between state and county views
function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 3,
        color: '#333',
        dashArray: '',
        fillOpacity: 0.9,
        className: 'state-hover'
    });

    layer.bringToFront();
    info.update(layer.feature.properties);
    
    if (currentView === 'state') {
        updateTable(layer.feature.properties);
    } else {
        updateCountyTable(layer.feature.properties);
    }
}

// Ensure smooth transitions between state and county views
function updateMap() {
    document.getElementById('yearDisplay').textContent = currentYear;
    
    if (currentView === 'state') {
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
        // Update table caption
        document.getElementById('tableCaption').innerHTML = '<h4>State Data</h4><p>Hover over a state to see details</p>';
    } else {
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
        // Update table caption
        document.getElementById('tableCaption').innerHTML = '<h4>County Data</h4><p>Hover over a county to see details</p>';
    }
    
    // Show table caption
    document.getElementById('tableCaption').style.display = 'block';
    
    // Clear table when switching views
    const table = document.getElementById('diabetesTable');
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    info.update();
    updateNationalStats();
}
