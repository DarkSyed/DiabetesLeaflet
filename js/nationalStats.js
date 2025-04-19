// Update the enhanced_map.js file to use the improved national statistics calculation

// Function to update national statistics
function updateNationalStats() {
    if (currentView === 'state') {
        if (nationalData) {
            const yearData = nationalData.find(d => d.Year == currentYear);
            if (yearData) {
                document.getElementById('nationalRate').textContent = yearData.Percentage + '%';
                document.getElementById('nationalRange').textContent = yearData.LowerLimit + '% - ' + yearData.UpperLimit + '%';
            }
        }
    } else {
        // County view - calculate from county data
        if (countyLayer) {
            const features = countyLayer.toGeoJSON().features;
            let total = 0;
            let count = 0;
            let min = 100;
            let max = 0;
            
            features.forEach(feature => {
                if (feature.properties.diabetesPercent) {
                    const value = parseFloat(feature.properties.diabetesPercent);
                    if (!isNaN(value)) {
                        total += value;
                        count++;
                        min = Math.min(min, value);
                        max = Math.max(max, value);
                    }
                }
            });
            
            const avg = count > 0 ? (total / count).toFixed(1) : 'N/A';
            
            document.getElementById('nationalRate').textContent = avg + '%';
            document.getElementById('nationalRange').textContent = min.toFixed(1) + '% - ' + max.toFixed(1) + '%';
        }
    }
}
