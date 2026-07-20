import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { restaurants as existingRestaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in environment variables.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CENTER_LAT = 32.2343; // Pima
const CENTER_LON = -110.9238; // Columbus

// Helper to normalize names
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Calculate Haversine distance
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

// Geocode address using Nominatim API
async function geocodeAddress(address: string): Promise<{ lat: number, lon: number } | null> {
  try {
    // Strip suite/unit/stall/bldg/building info to improve geocoding match success
    const cleanAddress = address
      .replace(/(suite|ste|unit|stall|#|bldg|building)\s*[a-z0-9\-]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress + ', Tucson, AZ')}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TuxFoodieBot/1.0 (hello@tuxfoodie.local)'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      return {
        lat: parseFloat(json[0].lat),
        lon: parseFloat(json[0].lon)
      };
    }
  } catch (err: any) {
    console.error(`Geocoding error for "${address}":`, err.message || err);
  }
  return null;
}

// Classify neighborhood
function classifyNeighborhood(lat: number, lon: number): string {
  if (lat >= 32.225 && lat <= 32.242 && lon >= -110.962 && lon <= -110.935) {
    return 'Central & University';
  }
  if (lat >= 32.210 && lat <= 32.228 && lon >= -110.985 && lon <= -110.962) {
    return 'Urban Core';
  }
  if (lat >= 32.285 && lon <= -110.980) {
    return 'Northwest & Marana';
  }
  if (lat >= 32.270 && lon >= -110.980 && lon <= -110.820) {
    return 'Northside & Foothills';
  }
  if (lon <= -110.985) {
    return 'Westside & Downtown';
  }
  if (lat <= 32.195 && lon <= -110.860) {
    return 'Southside & Heritage';
  }
  if (lon >= -110.860) {
    return 'Eastside & Vail';
  }
  return 'Central & Midtown';
}

async function main() {
  console.log("Starting Keyless Database Opening Scraper using Gemini Search Grounding...");

  const openingsJsonPath = path.join(process.cwd(), 'proposed_openings.json');
  const openingsMdPath = path.join(process.cwd(), 'proposed_openings.md');

  // Load existing proposed openings to preserve user choices
  let existingProposed: any[] = [];
  if (fs.existsSync(openingsJsonPath)) {
    try {
      existingProposed = JSON.parse(fs.readFileSync(openingsJsonPath, 'utf-8'));
    } catch (_) {}
  }

  // Phase 1: Call Gemini to discover and extract candidate openings
  console.log("\n--- Phase 1: Querying Google Search via Gemini for recent restaurant openings ---");
  const currentYear = new Date().getFullYear();
  const searchPrompt = `You are a local Tucson dining database auditor.
Use Google Search to find recent news articles and roundups detailing restaurant, bakery, cafe, pub, or food venue openings in Tucson, Arizona from 2024 to ${currentYear}.
Focus on monthly opening lists from Tucson Foodie (tucsonfoodie.com), This is Tucson (thisistucson.com), and the Arizona Daily Star (tucson.com).

Compile a comprehensive list of newly opened dining establishments mentioned in these sources.
Return ONLY a JSON array wrapped in a markdown json code block (e.g. \`\`\`json [ ... ] \`\`\`) matching this schema:
[
  {
    "name": string,
    "cuisine": string,
    "neighborhoodDescription": string
  }
]`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
  } catch (err: any) {
    console.error("Failed to query Gemini search for discovery phase:", err.message || err);
    process.exit(1);
  }

  const textRes = response.text || '';
  const jsonMatch = textRes.match(/```json\s*([\s\S]*?)\s*```/) || textRes.match(/```\s*([\s\S]*?)\s*```/) || [null, textRes];
  const candidatesRaw: Array<{ name: string; cuisine: string; neighborhoodDescription: string }> = JSON.parse((jsonMatch[1] || textRes).trim());
  const candidates = candidatesRaw.slice(0, 20);

  console.log(`Extracted ${candidatesRaw.length} candidate openings from web search. Processing first ${candidates.length}.`);

  // Phase 2: Verify and locate candidates individually
  console.log("\n--- Phase 2: Verifying and locating candidates individually ---");
  const confirmedOpenings: any[] = [];
  let candidateNum = 0;

  for (const cand of candidates) {
    candidateNum++;
    const norm = normalizeName(cand.name);

    // Skip if already exists in active database (substring match to catch near-duplicates)
    const existsInDB = existingRestaurants.some(r => {
      const normExisting = normalizeName(r.name);
      return normExisting === norm || norm.includes(normExisting) || normExisting.includes(norm);
    });
    if (existsInDB) {
      console.log(`[${candidateNum}/${candidates.length}] "${cand.name}" already in active database (or matched). Skipping.`);
      continue;
    }

    // Skip if already in proposed list (to avoid double verifying)
    const existsInProposed = existingProposed.some(p => {
      const normProp = normalizeName(p.name);
      return normProp === norm || norm.includes(normProp) || normProp.includes(norm);
    });
    if (existsInProposed) {
      console.log(`[${candidateNum}/${candidates.length}] "${cand.name}" already in proposed openings. Skipping.`);
      
      // Carry over to confirmedOpenings so we preserve it in the list
      const existing = existingProposed.find(p => {
        const normProp = normalizeName(p.name);
        return normProp === norm || norm.includes(normProp) || normProp.includes(norm);
      });
      if (existing) {
        confirmedOpenings.push(existing);
      }
      continue;
    }

    console.log(`[${candidateNum}/${candidates.length}] Verifying: "${cand.name}"`);

    const verifyPrompt = `Verify if the restaurant "${cand.name}" in Tucson, Arizona, is currently open or scheduled to open.
Find its exact street address, coordinates (latitude and longitude), price range ("$", "$$", or "$$$"), operating hours, and a short 10-15 word description of its signature items or vibe.
Return ONLY a JSON object wrapped in a markdown json code block matching this schema:
{
  "open": boolean,
  "address": string,
  "lat": number,
  "lon": number,
  "price": string,
  "notes": string,
  "hours": {
    "Monday": string,
    "Tuesday": string,
    "Wednesday": string,
    "Thursday": string,
    "Friday": string,
    "Saturday": string,
    "Sunday": string
  }
}
Format for hours must be "11:00 AM - 9:00 PM" (or other time range), "Closed", or "24 Hours". If multiple ranges apply, separate them with a comma (e.g. "11:00 AM - 3:00 PM, 5:00 PM - 10:00 PM").
If the restaurant does not exist, is permanently closed, or is not in Tucson, set open to false.`;

    try {
      let result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: verifyPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const resText = result.text || '';
      const m = resText.match(/```json\s*([\s\S]*?)\s*```/) || resText.match(/```\s*([\s\S]*?)\s*```/) || [null, resText];
      const verifiedDetails = JSON.parse((m[1] || resText).trim());

      if (verifiedDetails.open && verifiedDetails.address) {
        let lat = verifiedDetails.lat;
        let lon = verifiedDetails.lon;

        // Perform geocoding to get highly accurate coordinates and prevent LLM hallucinations
        const geocoded = await geocodeAddress(verifiedDetails.address);
        if (geocoded) {
          lat = geocoded.lat;
          lon = geocoded.lon;
          console.log(`   -> [GEOCODED] ${lat}, ${lon}`);
        } else {
          console.log(`   -> [FALLBACK COORDS] Using model coordinates: ${lat}, ${lon}`);
        }

        const distance = parseFloat(getDistanceMiles(CENTER_LAT, CENTER_LON, lat, lon).toFixed(1));
        
        if (distance > 25) {
          console.log(`   -> [TOO FAR] ${distance} mi away. Skipping.`);
          continue;
        }

        const neighborhood = classifyNeighborhood(lat, lon);
        const isLocal = !['mcdonald', 'starbuck', 'dutchbro', 'tacobell', 'burgerking', 'wendy', 'chickfila'].some(chain => norm.includes(chain));

        const existing = existingProposed.find(e => normalizeName(e.name) === norm);

        confirmedOpenings.push({
          name: cand.name,
          cuisine: cand.cuisine,
          neighborhood,
          distance,
          lat,
          lon,
          price: verifiedDetails.price || "$$",
          notes: verifiedDetails.notes || "New local favorite.",
          isLocal,
          enriched: true,
          hours: verifiedDetails.hours,
          address: verifiedDetails.address,
          verified: existing ? existing.verified : false
        });
        console.log(`   -> [CONFIRMED OPEN] ${verifiedDetails.address} (${distance} mi, ${neighborhood})`);
      } else {
        console.log(`   -> [NOT CONFIRMED] Closed, non-existent, or not in Tucson.`);
      }
    } catch (err: any) {
      console.error(`Failed to verify candidate "${cand.name}":`, err.message || err);
    }

    await sleep(6000); // Respect rate limits
  }

  // Update proposed_openings.json and proposed_openings.md
  fs.writeFileSync(openingsJsonPath, JSON.stringify(confirmedOpenings, null, 2), 'utf-8');

  let mdContent = `# Proposed New Openings Verification List\n\n`;
  mdContent += `We have scanned local dining news and found **${confirmedOpenings.length}** newly opened restaurants not yet in the active database.\n\n`;
  mdContent += `### Instructions for Verification:\n`;
  mdContent += `1. Review the list below.\n`;
  mdContent += `2. Open [proposed_openings.json](file://${openingsJsonPath}) in your editor.\n`;
  mdContent += `3. For any restaurant that you wish to add to the active database, change \`"verified": false\` to \`"verified": true\`.\n`;
  mdContent += `4. Run \`npx tsx scripts/apply-openings.ts\` to apply verified new openings to the database.\n\n`;
  mdContent += `| Status | Restaurant | Cuisine | Neighborhood | Distance | Address | Notes |\n`;
  mdContent += `| :---: | :--- | :--- | :--- | :---: | :--- | :--- |\n`;

  for (const o of confirmedOpenings) {
    const statusBox = o.verified ? '✅ Verified to Add' : '⏳ Pending Review';
    mdContent += `| ${statusBox} | **${o.name}** | ${o.cuisine} | ${o.neighborhood} | ${o.distance} mi | ${o.address} | ${o.notes} |\n`;
  }

  fs.writeFileSync(openingsMdPath, mdContent, 'utf-8');
  console.log(`\nSuccessfully updated proposed_openings.json and proposed_openings.md!`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
