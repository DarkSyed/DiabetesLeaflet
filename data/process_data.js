// This file demonstrates how to properly merge the diabetes data with accurate state boundaries

const fs = require('fs');
const path = require('path');

// Load the diabetes data from the simplified geometries file
const diabetesDataPath = path.join(__dirname, 'temporal', 'diabetes_by_state_years.geojson');
console.log(`Loading diabetes data from: ${diabetesDataPath}`);
const diabetesData = JSON.parse(fs.readFileSync(diabetesDataPath, 'utf8'));

// Create a map of state names to their diabetes data
const diabetesMap = {};
const stateNames = [];

diabetesData.features.forEach(feature => {
  const stateName = feature.properties.NAME;
  diabetesMap[stateName] = feature.properties.diabetes;
  stateNames.push(stateName);
});

console.log(`Loaded diabetes data for ${stateNames.length} states: ${stateNames.join(', ')}`);

// Load accurate state boundaries
const accurateStatesPath = path.join(__dirname, 'us_states_accurate.geojson');
console.log(`Loading accurate state boundaries from: ${accurateStatesPath}`);
const statesGeoJSON = JSON.parse(fs.readFileSync(accurateStatesPath, 'utf8'));

// Track states that got matched and those that didn't
const matchedStates = [];
const unmatchedStates = [];

// Merge the diabetes data into the proper state boundaries
statesGeoJSON.features.forEach(feature => {
  // Try different property names that might contain state names
  let stateName = feature.properties.NAME || 
                 feature.properties.name || 
                 feature.properties.State || 
                 feature.properties.STATE_NAME;
  
  // Handle case differences
  if (stateName) {
    stateName = stateName.trim();
    
    // Direct match
    if (diabetesMap[stateName]) {
      feature.properties.diabetes = diabetesMap[stateName];
      matchedStates.push(stateName);
    } 
    // Try case-insensitive match
    else {
      const normalizedName = stateName.toLowerCase();
      const match = Object.keys(diabetesMap).find(name => 
        name.toLowerCase() === normalizedName);
      
      if (match) {
        feature.properties.diabetes = diabetesMap[match];
        matchedStates.push(`${stateName} (matched to ${match})`);
      } else {
        // No match found - use placeholder
        feature.properties.diabetes = [
          {"year": 2000, "value": 5.0},
          {"year": 2005, "value": 6.0},
          {"year": 2010, "value": 7.0},
          {"year": 2015, "value": 8.0},
          {"year": 2020, "value": 9.0}
        ];
        unmatchedStates.push(stateName);
      }
    }
  } else {
    console.error("Feature missing state name:", feature);
    unmatchedStates.push("UNKNOWN");
  }
});

// Check which diabetes states weren't used
const unusedStates = stateNames.filter(name => !matchedStates.some(match => 
  match === name || match.includes(`(matched to ${name})`)));

// Print match statistics
console.log(`\nMatched ${matchedStates.length} states: ${matchedStates.join(', ')}`);

if (unmatchedStates.length > 0) {
  console.log(`\nFailed to match ${unmatchedStates.length} states: ${unmatchedStates.join(', ')}`);
}

if (unusedStates.length > 0) {
  console.log(`\nUnused diabetes data for ${unusedStates.length} states: ${unusedStates.join(', ')}`);
}

// Write the merged data to a new file
const outputPath = path.join(__dirname, 'merged_diabetes_states.geojson');
fs.writeFileSync(
  outputPath,
  JSON.stringify(statesGeoJSON, null, 2)
);

console.log(`\nSuccessfully merged data and saved to: ${outputPath}`);
