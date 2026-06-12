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
  const isChain = checkIfChain(scrapedName);
  for (const existing of list) {
    const normExisting = normalizeName(existing.name);
    // If names are highly similar
    const nameMatches = normScraped === normExisting || normScraped.includes(normExisting) || normExisting.includes(normScraped);
    if (nameMatches) {
      const distDiff = Math.abs(scrapedDistance - existing.distance);
      // For national chains, keep separate if they are more than 0.25 miles apart (separate branches)
      // For local restaurants, merge if they are within 1.5 miles and in the same neighborhood
      if (isChain) {
        if (distDiff < 0.25) return existing;
      } else {
        if (distDiff <= 1.5) return existing;
      }
    }
  }
  return undefined;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function enrichWithGemini(apiKey: string, newRestaurants: any[]) {
  const ai = new GoogleGenAI({ apiKey });
  
  const results: any[] = [];
  const batchSize = 30;
  let consecutiveRateLimits = 0;
  let aborted = false;
  
  for (let i = 0; i < newRestaurants.length; i += batchSize) {
    const batch = newRestaurants.slice(i, i + batchSize);
    
    if (aborted) {
      console.log(`Aborted. Skipping batch ${i / batchSize + 1} of ${Math.ceil(newRestaurants.length / batchSize)}...`);
      for (const item of batch) {
        results.push({
          name: item.name,
          cuisine: item.cuisine,
          neighborhood: item.neighborhood,
          distance: item.distance,
          price: item.price,
          notes: getFallbackNote(item.name, item.cuisine, item.neighborhood),
          isLocal: item.isLocal,
          enriched: false
        });
      }
      continue;
    }

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

    let response = null;
    let attempts = 0;
    const maxAttempts = 6;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        response = await ai.models.generateContent({
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
        success = true;
        consecutiveRateLimits = 0; // Reset on successful response
      } catch (err: any) {
        const isRateLimit = err.status === 429 || 
                            (err.message && err.message.includes('429')) || 
                            (err.message && err.message.toLowerCase().includes('quota exceeded')) ||
                            (err.message && err.message.toLowerCase().includes('rate limit'));
                            
        if (isRateLimit) {
          consecutiveRateLimits++;
          if (consecutiveRateLimits >= 3) {
            console.warn(`Hit consecutive rate limits ${consecutiveRateLimits} times. Aborting Gemini requests to save daily quota.`);
            aborted = true;
            break;
          }
          
          if (attempts < maxAttempts) {
            // Parse retry delay from error if present (usually around 30-40 seconds)
            let delayMs = Math.pow(2, attempts) * 2000 + Math.random() * 1000;
            if (err.message && err.message.includes('retry in')) {
              const match = err.message.match(/retry in ([\d\.]+)s/);
              if (match && match[1]) {
                delayMs = (parseFloat(match[1]) + 2) * 1000;
              }
            }
            console.warn(`Rate limit hit (429). Retrying in ${(delayMs / 1000).toFixed(1)} seconds... (Attempt ${attempts}/${maxAttempts})`);
            await sleep(delayMs);
          }
        } else {
          console.error(`Gemini API call failed for batch (Attempt ${attempts}/${maxAttempts}):`, err.message || err);
          break;
        }
      }
    }

    if (success && response) {
      try {
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
              isLocal: original.isLocal,
              enriched: true
            });
          }
        }
      } catch (jsonErr) {
        console.error("Failed to parse Gemini JSON response for batch:", jsonErr);
        success = false;
      }
    }

    if (!success) {
      console.log(`Using fallback heuristics for batch ${i / batchSize + 1}...`);
      for (const item of batch) {
        results.push({
          name: item.name,
          cuisine: item.cuisine,
          neighborhood: item.neighborhood,
          distance: item.distance,
          price: item.price,
          notes: getFallbackNote(item.name, item.cuisine, item.neighborhood),
          isLocal: item.isLocal,
          enriched: false
        });
      }
    }

    // Add a small 2-second delay between successful batches to respect Rate Limits
    if (i + batchSize < newRestaurants.length && success) {
      await sleep(2000);
    }
  }

  return results;
}

function isFallbackNote(note: string, cuisine: string, neighborhood: string): boolean {
  const lowerNote = note.toLowerCase();
  return (
    (lowerNote.includes('local favorite in') && lowerNote.includes('serving classic')) ||
    (lowerNote.includes('a great spot to enjoy delicious') && lowerNote.includes('area')) ||
    (lowerNote.includes('popular neighborhood destination featuring') && lowerNote.includes('specialties'))
  );
}

async function main() {
  try {
    const rawElements = await fetchFromOverpass();
    console.log(`Fetched ${rawElements.length} elements from OpenStreetMap.`);

    // 1. Normalize existing database, evaluating their 'enriched' status
    const existingList: Restaurant[] = existingRestaurants.map(r => {
      const isEnriched = r.enriched === true && !isFallbackNote(r.notes, r.cuisine, r.neighborhood);
      return {
        ...r,
        enriched: isEnriched
      };
    });

    // 2. Map to raw restaurants and deduplicate against raw scraped elements
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

    // 3. Compare scraped list against existing database to identify new and unenriched restaurants
    const updatedDatabase: Restaurant[] = [];
    const toEnrichMap = new Map<string, any>();

    for (const item of uniqueScraped) {
      const dup = findDuplicate(item.name, item.distance, existingList);
      
      if (!dup) {
        // Brand new restaurant! Add to database with fallback notes
        const newEntry: Restaurant = {
          name: item.name,
          cuisine: item.cuisine,
          neighborhood: item.neighborhood,
          distance: item.distance,
          price: item.price,
          notes: getFallbackNote(item.name, item.cuisine, item.neighborhood),
          isLocal: item.isLocal,
          enriched: false
        };
        updatedDatabase.push(newEntry);
      }
    }

    // Copy over all existing database items that weren't already added
    for (const r of existingList) {
      const key = `${normalizeName(r.name)}-${r.distance.toFixed(1)}`;
      const alreadyInDB = updatedDatabase.some(u => `${normalizeName(u.name)}-${u.distance.toFixed(1)}` === key);
      if (!alreadyInDB) {
        updatedDatabase.push(r);
      }
    }

    // Populate toEnrichMap from updatedDatabase (ensuring all unenriched items are queued)
    for (const r of updatedDatabase) {
      if (!r.enriched) {
        const key = `${normalizeName(r.name)}-${r.distance.toFixed(1)}`;
        toEnrichMap.set(key, {
          name: r.name,
          cuisine: r.cuisine,
          neighborhood: r.neighborhood,
          distance: r.distance,
          price: r.price,
          isLocal: r.isLocal
        });
      }
    }

    const toEnrichList = Array.from(toEnrichMap.values());
    console.log(`Total unenriched/new restaurants in database: ${toEnrichList.length}`);

    // Capping at 18 calls (safety margin below 20 requests/day limit)
    const apiKey = process.env.GEMINI_API_KEY;
    const MAX_GEMINI_CALLS = 18;
    const batchSize = 30;
    const maxToEnrich = MAX_GEMINI_CALLS * batchSize; // 540 restaurants

    let toProcess = toEnrichList;
    if (limit !== undefined) {
      console.log(`CLI --limit set: Only processing the first ${limit} unenriched restaurants.`);
      toProcess = toEnrichList.slice(0, limit);
    } else {
      console.log(`Daily enrichment limit: Processing first ${Math.min(toProcess.length, maxToEnrich)} of ${toProcess.length} unenriched restaurants.`);
      toProcess = toEnrichList.slice(0, maxToEnrich);
    }

    let enrichedResults: Restaurant[] = [];

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && toProcess.length > 0) {
      console.log(`Gemini API Key found. Initiating AI enrichment...`);
      enrichedResults = await enrichWithGemini(apiKey, toProcess);
    } else if (toProcess.length > 0) {
      console.log(`No Gemini API Key found (or template placeholder). Leaving fallback descriptions...`);
    }

    // Merge enriched results back into the updated database
    for (const enriched of enrichedResults) {
      const key = `${normalizeName(enriched.name)}-${enriched.distance.toFixed(1)}`;
      const dbEntry = updatedDatabase.find(u => `${normalizeName(u.name)}-${u.distance.toFixed(1)}` === key);
      if (dbEntry) {
        dbEntry.notes = enriched.notes;
        dbEntry.price = enriched.price;
        dbEntry.cuisine = enriched.cuisine;
        dbEntry.enriched = enriched.enriched;
      }
    }

    // Sort final list by distance (ascending) to keep data.ts organized
    updatedDatabase.sort((a, b) => a.distance - b.distance);

    console.log(`Total restaurants in final database: ${updatedDatabase.length}`);
    const totalEnriched = updatedDatabase.filter(r => r.enriched).length;
    console.log(`Progress: ${totalEnriched} / ${updatedDatabase.length} restaurants are fully enriched with Gemini descriptions (${(totalEnriched / updatedDatabase.length * 100).toFixed(1)}%).`);

    // 4. Write output back to src/data.ts safely using temporary file
    const dataFilePath = path.join(process.cwd(), 'src/data.ts');
    const tempFilePath = dataFilePath + '.tmp';

    const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = ${JSON.stringify(updatedDatabase, null, 2)};
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
