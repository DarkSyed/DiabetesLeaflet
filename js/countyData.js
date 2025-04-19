// County data converted to JavaScript format for easier access
const countyData = {
  loadData: async function() {
    try {
      // Load county boundaries
      const countyResponse = await fetch('../data/us_counties.geojson');
      const countyBoundaries = await countyResponse.json();
      
      // Load diabetes prevalence data
      const diabetesResponse = await fetch('../data/diabetes_prevalence.csv');
      const diabetesText = await diabetesResponse.text();
      
      // Parse CSV data
      const diabetesData = this.parseCSV(diabetesText);
      
      // Combine data
      const combinedData = this.combineData(countyBoundaries, diabetesData);
      
      return combinedData;
    } catch (error) {
      console.error('Error loading county data:', error);
      return null;
    }
  },
  
  parseCSV: function(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',');
      const entry = {};
      
      for (let j = 0; j < headers.length; j++) {
        entry[headers[j]] = values[j];
      }
      
      // Format FIPS code with leading zeros
      entry.FIPS = entry['FIPS.Codes'] ? String(entry['FIPS.Codes']).padStart(5, '0') : '';
      
      // Calculate average diabetes prevalence
      const menDiabetes = parseFloat(entry['percent.men.diabetes']) || 0;
      const womenDiabetes = parseFloat(entry['percent.women.diabetes']) || 0;
      entry.diabetesPercent = ((menDiabetes + womenDiabetes) / 2).toFixed(1);
      
      result.push(entry);
    }
    
    return result;
  },
  
  combineData: function(countyBoundaries, diabetesData) {
    // Create lookup for diabetes data by FIPS code
    const diabetesByFIPS = {};
    diabetesData.forEach(county => {
      diabetesByFIPS[county.FIPS] = county;
    });
    
    // Add diabetes data to county features
    const features = countyBoundaries.features.map(feature => {
      const geoid = feature.properties.GEOID || feature.properties.GEO_ID;
      let fips = geoid;
      
      // Some GeoJSON files have GEO_ID in format like "0500000US01001"
      if (geoid && typeof geoid === 'string' && geoid.startsWith('0500000US')) {
        fips = geoid.substring(9);
      }
      
      if (fips && diabetesByFIPS[fips]) {
        // Create a new feature with combined properties
        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            ...feature.properties,
            county: diabetesByFIPS[fips].County,
            state: diabetesByFIPS[fips].State,
            diabetesPercent: diabetesByFIPS[fips].diabetesPercent,
            menDiabetesPercent: diabetesByFIPS[fips]['percent.men.diabetes'],
            womenDiabetesPercent: diabetesByFIPS[fips]['percent.women.diabetes'],
            menObesePercent: diabetesByFIPS[fips]['percent.men.obese'],
            womenObesePercent: diabetesByFIPS[fips]['percent.women.obese']
          }
        };
      } else {
        // Return original feature if no matching diabetes data
        return feature;
      }
    });
    
    return {
      type: "FeatureCollection",
      features: features
    };
  },
  
  // Get color based on diabetes percentage
  getColor: function(d) {
    return d > 16 ? '#3A1C71' : // deep purple
           d > 14 ? '#4B36D1' : // medium purple
           d > 12 ? '#5560E9' : // blue-purple
           d > 10 ? '#5E8BEF' : // light blue
           d > 8  ? '#66B3F3' : // sky blue
           d > 6  ? '#72D8F7' : // light cyan
           d > 4  ? '#7FFFD4' : // aquamarine
                    '#E0FFFF';   // light cyan
  },
  
  // Style function for county features
  style: function(feature) {
    const diabetesValue = feature.properties.diabetesPercent ? parseFloat(feature.properties.diabetesPercent) : 0;
    
    return {
      fillColor: this.getColor(diabetesValue),
      weight: 0.8,          // Thinner borders for counties
      opacity: 1,
      color: 'black',       // Black borders to match states
      dashArray: '',        // Solid lines
      fillOpacity: 0.85,    // Match state opacity
      smoothFactor: 0.5     // Lower smooth factor
    };
  },
  
  // Get national statistics for counties
  getNationalStats: function(features) {
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
    
    return {
      average: avg,
      range: `${min.toFixed(1)}% - ${max.toFixed(1)}%`
    };
  }
};
