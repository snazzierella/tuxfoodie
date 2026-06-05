import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { restaurants as existingRestaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Load environment variables from .env and .env.local
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const CENTER_LAT = 32.2343; // Pima
const CENTER_LON = -110.9238; // Columbus

// Set up limit from CLI arguments if provided (e.g. --limit 10)
const limitArgIndex = process.argv.indexOf('--limit');
const limit = limitArgIndex !== -1 ? parseInt(process.argv[limitArgIndex + 1], 10) : undefined;

const NATIONAL_CHAINS = new Set([
  'mcdonalds', 'starbucks', 'subway', 'tacobell', 'burgerking', 'wendys',
  'dunkin', 'pizzahut', 'dominos', 'kfc', 'sonicdrivein', 'dairyqueen',
  'papajohns', 'littlecaesars', 'jackinthebox', 'arby', 'arbys', 'panerabread',
  'chipotle', 'chipotlemexicangrill', 'pandaexpress', 'popeyes', 'chickfila',
  'dutchbros', 'dutchbroscoffee', 'fiveguys', 'whataburger', 'jimmyjohns',
  'hardees', 'elpolloloco', 'dennys', 'ihop', 'applebees', 'olivegarden',
  'buffalo-wild-wings', 'buffalowildwings', 'chilis', 'chilisgrill&bar',
  'redlobster', 'outbacksteakhouse', 'texasroadhouse', 'cheesecakefactory',
  'pfchangs', 'panera', 'subway', 'jersey_mikes', 'jerseymikes', 'firehousesubs'
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '') // Remove parenthesized locations like "(Grant)"
    .replace(/[^a-z0-9]/g, ''); // Remove punctuation
}

function checkIfChain(name: string): boolean {
  const norm = normalizeName(name);
  for (const chain of NATIONAL_CHAINS) {
    if (norm.includes(chain)) return true;
  }
  return false;
}

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function classifyNeighborhood(lat: number, lon: number): string {
  // Central & University (U of A area)
  if (lat >= 32.225 && lat <= 32.242 && lon >= -110.962 && lon <= -110.935) {
    return 'Central & University';
  }
  // Urban Core / Downtown
  if (lat >= 32.210 && lat <= 32.228 && lon >= -110.985 && lon <= -110.962) {
    return 'Urban Core';
  }
  // Northwest & Marana
  if (lat >= 32.285 && lon <= -110.980) {
    return 'Northwest & Marana';
  }
  // Northside & Foothills
  if (lat >= 32.270 && lon >= -110.980 && lon <= -110.820) {
    return 'Northside & Foothills';
  }
  // Westside & Downtown
  if (lon <= -110.985) {
    return 'Westside & Downtown';
  }
  // Southside & Heritage
  if (lat <= 32.195 && lon <= -110.860) {
    return 'Southside & Heritage';
  }
  // Eastside & Vail
  if (lon >= -110.860) {
    return 'Eastside & Vail';
  }
  // Fallback: Central & Midtown
  return 'Central & Midtown';
}

function classifyCuisine(tags: any): string {
  const cuisineTag = (tags.cuisine || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const name = (tags.name || '').toLowerCase();

  if (cuisineTag.includes('bubble_tea') || cuisineTag.includes('tea') || cuisineTag.includes('juice') || cuisineTag.includes('smoothie') || name.includes('boba') || name.includes('tea house') || name.includes('happy lemon')) {
    return 'Boba Tea & Beverages';
  }
  if (amenity === 'cafe' || cuisineTag.includes('coffee') || name.includes('coffee') || name.includes('cafe') || name.includes('espresso') || name.includes('starbucks') || name.includes('dutch bros')) {
    return 'Coffee & Cafe';
  }
  if (cuisineTag.includes('bakery') || cuisineTag.includes('ice_cream') || cuisineTag.includes('donut') || cuisineTag.includes('dessert') || cuisineTag.includes('cake') || cuisineTag.includes('pastry') || name.includes('bakery') || name.includes('bakeshop') || name.includes('ice cream') || name.includes('yogurt') || name.includes('crumbl')) {
    return 'Dessert & Bakery';
  }
  if (cuisineTag.includes('mexican') || cuisineTag.includes('taco') || cuisineTag.includes('burrito') || cuisineTag.includes('quesadilla') || name.includes('taco') || name.includes('mexican') || name.includes('taqueria') || name.includes('burrito')) {
    return 'Mexican & Sonoran';
  }
  if (cuisineTag.includes('italian') || cuisineTag.includes('pizza') || cuisineTag.includes('pasta') || name.includes('pizza') || name.includes('pizzeria')) {
    return 'Italian & Pizza';
  }
  if (cuisineTag.includes('chinese') || cuisineTag.includes('japanese') || cuisineTag.includes('sushi') || cuisineTag.includes('thai') || cuisineTag.includes('vietnamese') || cuisineTag.includes('korean') || cuisineTag.includes('asian') || cuisineTag.includes('noodle') || cuisineTag.includes('indian') || cuisineTag.includes('ramen') || name.includes('sushi') || name.includes('thai') || name.includes('chinese') || name.includes('viet') || name.includes('pho') || name.includes('ramen') || name.includes('wok')) {
    return 'Asian & Sushi';
  }
  if (cuisineTag.includes('greek') || cuisineTag.includes('mediterranean') || cuisineTag.includes('middle_eastern') || cuisineTag.includes('lebanese') || cuisineTag.includes('turkish') || cuisineTag.includes('african') || cuisineTag.includes('french') || cuisineTag.includes('spanish') || cuisineTag.includes('german') || cuisineTag.includes('gyro') || name.includes('mediterranean') || name.includes('greek') || name.includes('gyro')) {
    return 'Mediterranean & Global';
  }
  if (cuisineTag.includes('breakfast') || cuisineTag.includes('pancake') || cuisineTag.includes('diner') || name.includes('diner') || name.includes('breakfast') || name.includes('waffle') || name.includes('pancake')) {
    return 'Breakfast & Diner';
  }
  if (cuisineTag.includes('steak') || cuisineTag.includes('bbq') || cuisineTag.includes('barbecue') || name.includes('steakhouse') || name.includes('bbq') || name.includes('barbecue')) {
    return 'Steakhouse & BBQ';
  }
  if (cuisineTag.includes('seafood') || cuisineTag.includes('fish') || name.includes('seafood') || name.includes('oyster') || name.includes('crab')) {
    return 'Seafood';
  }
  if (cuisineTag.includes('vegan') || cuisineTag.includes('vegetarian') || cuisineTag.includes('salad') || cuisineTag.includes('healthy') || name.includes('salad') || name.includes('vegan') || name.includes('healthy')) {
    return 'Healthy, Vegan & Plant-Based';
  }
  if (amenity === 'pub' || amenity === 'bar' || cuisineTag.includes('pub') || cuisineTag.includes('brewery') || name.includes('pub') || name.includes('bar & grill') || name.includes('brewery') || name.includes('tavern') || name.includes('taproom')) {
    return 'Bar, Pub & Brewery';
  }
  if (amenity === 'fast_food' || cuisineTag.includes('burger') || cuisineTag.includes('sandwich') || cuisineTag.includes('chicken') || cuisineTag.includes('wings') || cuisineTag.includes('fast_food') || name.includes('burger') || name.includes('sandwich') || name.includes('subway') || name.includes('mcdonald') || name.includes('wendy') || name.includes('burger king') || name.includes('dairy queen') || name.includes('wings') || name.includes('chicken')) {
    return 'Fast Food & Sandwiches';
  }
  
  return 'American & Comfort';
}

function getFallbackNote(name: string, cuisine: string, neighborhood: string): string {
  const templates = [
    `Local favorite in ${neighborhood} serving classic ${cuisine.toLowerCase()} options.`,
    `A great spot to enjoy delicious ${cuisine.toLowerCase()} in the ${neighborhood} area.`,
    `Popular neighborhood destination featuring fresh ${cuisine.toLowerCase()} specialties.`,
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return templates[hash % templates.length];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

async function fetchFromOverpass() {
  const query = `
    [out:json][timeout:180];
    (
      nwr(around:50000, ${CENTER_LAT}, ${CENTER_LON})["amenity"="restaurant"];
      nwr(around:50000, ${CENTER_LAT}, ${CENTER_LON})["amenity"="fast_food"];
      nwr(around:50000, ${CENTER_LAT}, ${CENTER_LON})["amenity"="cafe"];
      nwr(around:50000, ${CENTER_LAT}, ${CENTER_LON})["amenity"="bar"];
      nwr(around:50000, ${CENTER_LAT}, ${CENTER_LON})["amenity"="pub"];
    );
    out center;
  `;
  
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Executing Overpass API query using endpoint: ${url}...`);
      const response = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TuxFoodieMegamapBuilder/1.0 (snazzierella@example.com)',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Endpoint ${url} failed with status: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = (await response.json()) as { elements: any[] };
      return data.elements || [];
    } catch (err: any) {
      console.warn(`Endpoint ${url} encountered an error: ${err.message || err}`);
    }
  }

  throw new Error("All Overpass API endpoints failed to respond successfully.");
}

function findDuplicate(scrapedName: string, scrapedDistance: number, list: Restaurant[]): Restaurant | undefined {
  const normScraped = normalizeName(scrapedName);
  for (const existing of list) {
    const normExisting = normalizeName(existing.name);
    // If names are highly similar
    const nameMatches = normScraped.includes(normExisting) || normExisting.includes(normScraped);
    if (nameMatches) {
      // Check if distance projection is close (within 0.15 miles)
      const distDiff = Math.abs(scrapedDistance - existing.distance);
      if (distDiff < 0.15) {
        return existing;
      }
    }
  }
  return undefined;
}

async function enrichWithGemini(apiKey: string, newRestaurants: any[]) {
  const ai = new GoogleGenAI({ apiKey });
  
  const results: any[] = [];
  const batchSize = 30;
  
  for (let i = 0; i < newRestaurants.length; i += batchSize) {
    const batch = newRestaurants.slice(i, i + batchSize);
    console.log(`Enriching batch ${i / batchSize + 1} of ${Math.ceil(newRestaurants.length / batchSize)} (size: ${batch.length})...`);
    
    const prompt = `You are a native Tucson food critic. Review the following restaurants and produce a JSON array. 
For each restaurant:
1. Provide a short, engaging description/note (exactly 10-15 words) focusing on its specialties, signature dishes, or vibe (e.g., "Cozy neighborhood diner famous for massive pancakes and classic breakfast combos.").
2. Select the correct price category: "$", "$$", or "$$$".
3. Refine the cuisine type. Must be one of the following exact strings:
   - "Dessert & Bakery"
   - "Asian & Sushi"
   - "Mediterranean & Global"
   - "Mexican & Sonoran"
   - "Breakfast & Diner"
   - "Italian & Pizza"
   - "Fast Food & Sandwiches"
   - "American & Comfort"
   - "Boba Tea & Beverages"
   - "Bar, Pub & Brewery"
   - "Steakhouse & BBQ"
   - "Healthy, Vegan & Plant-Based"
   - "Seafood"
   - "Coffee & Cafe"

Input:
${JSON.stringify(batch.map((r, index) => ({ id: index, name: r.name, cuisineSuggestion: r.cuisine, neighborhood: r.neighborhood })))}

Return ONLY a JSON array in the schema:
[
  {
    "id": number,
    "notes": string,
    "price": string,
    "cuisine": string
  }
]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'INTEGER' },
                notes: { type: 'STRING' },
                price: { type: 'STRING' },
                cuisine: { type: 'STRING' }
              },
              required: ['id', 'notes', 'price', 'cuisine']
            }
          }
        }
      });

      const responseText = response.text || '[]';
      const enrichedBatch = JSON.parse(responseText);
      
      for (const item of enrichedBatch) {
        const original = batch[item.id];
        if (original) {
          results.push({
            name: original.name,
            cuisine: item.cuisine,
            neighborhood: original.neighborhood,
            distance: original.distance,
            price: item.price,
            notes: item.notes,
            isLocal: original.isLocal
          });
        }
      }
    } catch (err) {
      console.error("Gemini API call failed, falling back to local defaults for this batch:", err);
      // Fallback for failed batch
      for (const item of batch) {
        results.push({
          name: item.name,
          cuisine: item.cuisine,
          neighborhood: item.neighborhood,
          distance: item.distance,
          price: item.price,
          notes: getFallbackNote(item.name, item.cuisine, item.neighborhood),
          isLocal: item.isLocal
        });
      }
    }
  }

  return results;
}

async function main() {
  try {
    const rawElements = await fetchFromOverpass();
    console.log(`Fetched ${rawElements.length} elements from OpenStreetMap.`);

    // 1. Map to raw restaurants and deduplicate against raw scraped elements
    const scrapedList: any[] = [];
    for (const el of rawElements) {
      const name = el.tags?.name;
      if (!name) continue;

      const lat = el.lat !== undefined ? el.lat : el.center?.lat;
      const lon = el.lon !== undefined ? el.lon : el.center?.lon;
      if (lat === undefined || lon === undefined) continue;

      const distance = parseFloat(getDistanceMiles(CENTER_LAT, CENTER_LON, lat, lon).toFixed(1));
      
      const parsedCuisine = classifyCuisine(el.tags);
      const neighborhood = classifyNeighborhood(lat, lon);
      
      // Default price
      const isFastFood = el.tags.amenity === 'fast_food' || parsedCuisine === 'Fast Food & Sandwiches';
      const isBakeryOrCafe = parsedCuisine === 'Dessert & Bakery' || parsedCuisine === 'Coffee & Cafe' || parsedCuisine === 'Boba Tea & Beverages';
      const price = isFastFood || isBakeryOrCafe ? '$' : '$$';

      const isLocal = !checkIfChain(name);

      scrapedList.push({
        name,
        cuisine: parsedCuisine,
        neighborhood,
        distance,
        price,
        isLocal
      });
    }

    // Deduplicate scraped list itself to remove OSM duplicates (same coordinate + name)
    const uniqueScraped: any[] = [];
    for (const item of scrapedList) {
      const isDup = uniqueScraped.some(u => {
        const nameMatch = normalizeName(u.name) === normalizeName(item.name);
        const distDiff = Math.abs(u.distance - item.distance);
        return nameMatch && distDiff < 0.15;
      });
      if (!isDup) {
        uniqueScraped.push(item);
      }
    }
    
    console.log(`After internal OSM deduplication: ${uniqueScraped.length} unique restaurants.`);

    // 2. Separate into "already existing" and "new" by comparing with data.ts
    const finalRestaurants: Restaurant[] = [...existingRestaurants];
    const newToProcess: any[] = [];

    for (const item of uniqueScraped) {
      const dup = findDuplicate(item.name, item.distance, existingRestaurants);
      if (!dup) {
        newToProcess.push(item);
      }
    }

    console.log(`Found ${newToProcess.length} new restaurants to add.`);

    // Apply limit if specified
    let newToEnrich = newToProcess;
    if (limit !== undefined) {
      console.log(`CLI --limit set: Only processing the first ${limit} new restaurants.`);
      newToEnrich = newToProcess.slice(0, limit);
    }

    // 3. Enrich the new items
    const apiKey = process.env.GEMINI_API_KEY;
    let enrichedNew: Restaurant[] = [];

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      console.log(`Gemini API Key found. Initiating AI enrichment...`);
      enrichedNew = await enrichWithGemini(apiKey, newToEnrich);
    } else {
      console.log(`No Gemini API Key found (or template placeholder). Using local heuristics...`);
      enrichedNew = newToEnrich.map(item => ({
        name: item.name,
        cuisine: item.cuisine,
        neighborhood: item.neighborhood,
        distance: item.distance,
        price: item.price,
        notes: getFallbackNote(item.name, item.cuisine, item.neighborhood),
        isLocal: item.isLocal
      }));
    }

    // Add enriched items to final list
    finalRestaurants.push(...enrichedNew);

    // Sort final list by distance (ascending) to keep data.ts organized
    finalRestaurants.sort((a, b) => a.distance - b.distance);

    console.log(`Total restaurants in final database: ${finalRestaurants.length}`);

    // 4. Write output back to src/data.ts safely using temporary file
    const dataFilePath = path.join(process.cwd(), 'src/data.ts');
    const tempFilePath = dataFilePath + '.tmp';

    const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = ${JSON.stringify(finalRestaurants, null, 2)};
`;

    fs.writeFileSync(tempFilePath, fileContent, 'utf-8');
    fs.renameSync(tempFilePath, dataFilePath);

    console.log(`Successfully updated ${dataFilePath}!`);

  } catch (error) {
    console.error("An error occurred during update process:", error);
    process.exit(1);
  }
}

main();
