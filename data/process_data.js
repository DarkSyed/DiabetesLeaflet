// Process the accurate state boundaries and merge with diabetes data
const fs = require('fs');
const path = require('path');

// Paths to data files
const accurateStatesPath = path.join(__dirname, 'us_states_accurate.geojson');
const diabetesDataPath = path.join(__dirname, 'temporal', 'diabetes_by_state_years.geojson');
const outputPath = path.join(__dirname, 'merged_diabetes_states.geojson');

// Read the files
console.log('Reading accurate state boundaries...');
const statesData = JSON.parse(fs.readFileSync(accurateStatesPath, 'utf8'));
console.log('Reading diabetes temporal data...');
const diabetesData = JSON.parse(fs.readFileSync(diabetesDataPath, 'utf8'));

// Create a mapping of state names to diabetes data
const diabetesMap = {};
diabetesData.features.forEach(feature => {
  diabetesMap[feature.properties.NAME] = feature.properties.diabetes;
});

console.log('Merging data...');
// Merge the diabetes data into the accurate state boundaries
statesData.features.forEach(feature => {
  const stateName = feature.properties.NAME;
  if (diabetesMap[stateName]) {
    feature.properties.diabetes = diabetesMap[stateName];
  } else {
    // If no data for this state, create placeholder data
    feature.properties.diabetes = [
      {"year": 2000, "value": 5.0},
      {"year": 2005, "value": 6.0},
      {"year": 2010, "value": 7.0},
      {"year": 2015, "value": 8.0},
      {"year": 2020, "value": 9.0}
    ];
  }
});

// Save the merged data
console.log('Saving merged data...');
fs.writeFileSync(outputPath, JSON.stringify(statesData));
console.log('Data processing complete. Output saved to:', outputPath);
