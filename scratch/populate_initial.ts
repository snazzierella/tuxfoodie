import fs from 'fs';
import path from 'path';
import { restaurants } from '../src/data';
import { Restaurant } from '../src/types';

const CLOSED_TO_REMOVE = new Set([
  "may's counter",
  "chef alisah's",
  "tucson tamale",
  "pasco kitchen and lounge",
  "welcome diner",
  "sausage deli",
  "pastiche modern eatery"
]);

// 1. Filter out closed restaurants and update Wok & Roll
let cleaned = restaurants.filter(r => {
  const lowerName = r.name.toLowerCase().trim();
  if (CLOSED_TO_REMOVE.has(lowerName)) {
    console.log(`Removing closed restaurant: ${r.name}`);
    return false;
  }
  return true;
}).map(r => {
  if (r.name === "Wok & Roll") {
    return {
      ...r,
      manuallyAdded: true,
      hours: {
        "Monday": "11:00 AM - 9:00 PM",
        "Tuesday": "11:00 AM - 9:00 PM",
        "Wednesday": "11:00 AM - 9:00 PM",
        "Thursday": "11:00 AM - 9:00 PM",
        "Friday": "11:00 AM - 9:00 PM",
        "Saturday": "11:00 AM - 9:00 PM",
        "Sunday": "11:00 AM - 9:00 PM"
      }
    };
  }
  return r;
});

// 2. Add Monsoon Chocolate
const monsoonChocolate: Restaurant = {
  name: "Monsoon Chocolate",
  cuisine: "Dessert & Bakery",
  neighborhood: "Central & Midtown",
  distance: 3.1,
  price: "$$",
  notes: "Award-winning bean-to-bar chocolate factory and cafe serving gourmet confections and craft coffee.",
  isLocal: true,
  enriched: true,
  manuallyAdded: true,
  hours: {
    "Monday": "Closed",
    "Tuesday": "12:00 PM - 4:00 PM",
    "Wednesday": "12:00 PM - 4:00 PM",
    "Thursday": "12:00 PM - 4:00 PM",
    "Friday": "12:00 PM - 4:00 PM",
    "Saturday": "10:00 AM - 4:00 PM",
    "Sunday": "Closed"
  }
};

// 3. Add Taqueria Juanito's
const taqueriaJuanitos: Restaurant = {
  name: "Taqueria Juanito's",
  cuisine: "Mexican & Sonoran",
  neighborhood: "Westside & Downtown",
  distance: 3.8,
  price: "$",
  notes: "Classic counter-service taqueria famous for tender al pastor, cabeza, and massive burritos.",
  isLocal: true,
  enriched: true,
  manuallyAdded: true,
  hours: {
    "Monday": "8:00 AM - 10:00 PM",
    "Tuesday": "8:00 AM - 10:00 PM",
    "Wednesday": "8:00 AM - 10:00 PM",
    "Thursday": "8:00 AM - 10:00 PM",
    "Friday": "8:00 AM - 10:00 PM",
    "Saturday": "8:00 AM - 10:00 PM",
    "Sunday": "8:00 AM - 10:00 PM"
  }
};

cleaned.push(monsoonChocolate);
cleaned.push(taqueriaJuanitos);

// 4. Sort by distance
cleaned.sort((a, b) => a.distance - b.distance);

console.log(`Original count: ${restaurants.length}`);
console.log(`New count: ${cleaned.length}`);

// Write back to src/data.ts
const dataFilePath = path.join(process.cwd(), 'src/data.ts');
const fileContent = 'import { Restaurant } from \'./types\';\n\nexport const restaurants: Restaurant[] = ' + JSON.stringify(cleaned, null, 2) + ';\n';
fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
console.log('Successfully updated src/data.ts with manual additions and removed closed restaurants.');
