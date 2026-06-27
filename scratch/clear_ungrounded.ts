import fs from 'fs';
import path from 'path';
import { restaurants } from '../src/data';
import { Restaurant } from '../src/types';

const PRESERVED_SPOTS = new Set([
  "monsoon chocolate",
  "taqueria juanito's",
  "wok & roll",
  "black crown coffee",
  "espresso art",
  "biscuits country cafe"
]);

let clearedCount = 0;
let preservedCount = 0;

const updated = restaurants.map(r => {
  const lowerName = r.name.toLowerCase().trim();
  if (r.manuallyAdded || PRESERVED_SPOTS.has(lowerName)) {
    preservedCount++;
    return r; // Keep hours
  }
  
  if (r.hours) {
    clearedCount++;
    return {
      ...r,
      hours: undefined // Reset hours to trigger re-enrichment
    };
  }
  
  return r;
});

console.log(`Preserved spots count: ${preservedCount}`);
console.log(`Cleared ungrounded hours count: ${clearedCount}`);

// Write back to src/data.ts
const dataFilePath = path.join(process.cwd(), 'src/data.ts');
const fileContent = 'import { Restaurant } from \'./types\';\n\nexport const restaurants: Restaurant[] = ' + JSON.stringify(updated, null, 2) + ';\n';
fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
console.log('Successfully cleared ungrounded hours. Ready for grounded re-enrichment!');
