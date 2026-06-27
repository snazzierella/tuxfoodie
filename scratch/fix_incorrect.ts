import fs from 'fs';
import path from 'path';
import { restaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Remove closed or non-existent spots
const spotsToRemove = new Set([
  "flora's market run",
  "hatch"
]);

const cleaned = restaurants.filter(r => {
  const lowerName = r.name.toLowerCase().trim();
  if (spotsToRemove.has(lowerName)) {
    console.log(`Removing spot: ${r.name}`);
    return false;
  }
  return true;
}).map(r => {
  if (r.name === "Black Crown Coffee") {
    console.log("Correcting hours for Black Crown Coffee...");
    return {
      ...r,
      hours: {
        "Monday": "8:00 AM - 6:00 PM",
        "Tuesday": "8:00 AM - 12:00 AM",
        "Wednesday": "8:00 AM - 12:00 AM",
        "Thursday": "8:00 AM - 12:00 AM",
        "Friday": "8:00 AM - 12:00 AM",
        "Saturday": "8:00 AM - 12:00 AM",
        "Sunday": "8:00 AM - 12:00 AM"
      }
    };
  }
  if (r.name === "Espresso Art") {
    console.log("Correcting hours for Espresso Art...");
    return {
      ...r,
      hours: {
        "Monday": "8:30 AM - 12:30 AM",
        "Tuesday": "8:30 AM - 12:30 AM",
        "Wednesday": "8:30 AM - 1:30 AM",
        "Thursday": "8:30 AM - 1:30 AM",
        "Friday": "8:30 AM - 1:30 AM",
        "Saturday": "10:00 AM - 1:30 AM",
        "Sunday": "9:00 AM - 12:30 AM"
      }
    };
  }
  if (r.name === "Biscuits Country Cafe") {
    console.log("Correcting hours for Biscuits Country Cafe...");
    return {
      ...r,
      hours: {
        "Monday": "7:00 AM - 1:00 PM",
        "Tuesday": "7:00 AM - 1:00 PM",
        "Wednesday": "7:00 AM - 1:00 PM",
        "Thursday": "7:00 AM - 1:00 PM",
        "Friday": "7:00 AM - 1:00 PM",
        "Saturday": "7:00 AM - 1:00 PM",
        "Sunday": "7:00 AM - 1:00 PM"
      }
    };
  }
  return r;
});

// Sort by distance
cleaned.sort((a, b) => a.distance - b.distance);

console.log(`Original count: ${restaurants.length}`);
console.log(`New count: ${cleaned.length}`);

// Write back to src/data.ts
const dataFilePath = path.join(process.cwd(), 'src/data.ts');
const fileContent = 'import { Restaurant } from \'./types\';\n\nexport const restaurants: Restaurant[] = ' + JSON.stringify(cleaned, null, 2) + ';\n';
fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
console.log('Successfully corrected specific hours and removed outdated listings.');
