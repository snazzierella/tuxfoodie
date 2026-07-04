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
if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
  console.error('Error: GEMINI_API_KEY is not set in environment variables or .env file.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const CHECKPOINT_FILE = path.join(process.cwd(), 'scratch', 'enrich_progress.json');

// Command line arguments
const mode = process.argv.includes('--verify-only') ? 'verify' : 'enrich';
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : undefined;
const resume = process.argv.includes('--resume');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Checkpoint {
  completedNames: string[];
}

function loadCheckpoint(): Checkpoint {
  if (resume && fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
      return data;
    } catch (err) {
      console.warn('Failed to parse checkpoint file, starting fresh.');
    }
  }
  return { completedNames: [] };
}

function saveCheckpoint(checkpoint: Checkpoint) {
  const dir = path.dirname(CHECKPOINT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf-8');
}

async function enrichBatch(batch: Restaurant[]): Promise<any[]> {
  const prompt = `You are a local Tucson dining assistant. Review the following restaurants in Tucson, Arizona.
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
4. Search for the actual current operating hours on Google. Return an hours object containing fields for each day of the week: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday". Format should be "11:00 AM - 9:00 PM", "Closed", or "24 Hours".

Input:
${JSON.stringify(batch.map((r, index) => ({ id: index, name: r.name, cuisineSuggestion: r.cuisine, neighborhood: r.neighborhood })))}

Return ONLY a JSON array wrapped in a markdown json code block (e.g. \`\`\`json [ ... ] \`\`\`) matching this schema:
[
  {
    "id": number,
    "notes": string,
    "price": string,
    "cuisine": string,
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
]`;

  let response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || '';
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || [null, text];
  return JSON.parse((jsonMatch[1] || text).trim());
}

async function verifyBatch(batch: Restaurant[]): Promise<any[]> {
  const prompt = `You are a local Tucson dining assistant. Review the following restaurants in Tucson, Arizona.
For each restaurant, check its actual operating hours on Google Search and verify if our current hours are correct. If our current hours are incorrect or missing, provide the correct hours.

Input (with current hours):
${JSON.stringify(batch.map((r, index) => ({ id: index, name: r.name, currentHours: r.hours, neighborhood: r.neighborhood })))}

Return ONLY a JSON array wrapped in a markdown json code block (e.g. \`\`\`json [ ... ] \`\`\`) matching this schema:
[
  {
    "id": number,
    "hoursCorrect": boolean,
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
]`;

  let response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || '';
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || [null, text];
  return JSON.parse((jsonMatch[1] || text).trim());
}

async function main() {
  const checkpoint = loadCheckpoint();
  console.log(`Running in Mode: ${mode.toUpperCase()}`);
  console.log(`Loaded checkpoint: ${checkpoint.completedNames.length} restaurants already processed.`);

  // Filter candidates based on mode
  let candidates: Restaurant[] = [];
  if (mode === 'enrich') {
    candidates = existingRestaurants.filter(r => !r.enriched);
  } else {
    candidates = existingRestaurants.filter(r => r.enriched);
  }

  // Filter out already completed ones from checkpoint
  candidates = candidates.filter(r => !checkpoint.completedNames.includes(r.name));

  if (limit !== undefined) {
    console.log(`Capping run to ${limit} restaurants based on --limit.`);
    candidates = candidates.slice(0, limit);
  }

  if (candidates.length === 0) {
    console.log('No restaurants to process.');
    process.exit(0);
  }

  console.log(`Total restaurants to process in this run: ${candidates.length}`);

  const batchSize = 10; // Smaller batch size (10) is safer for rate limits and payload sizes
  const updatedDatabase = [...existingRestaurants];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(candidates.length / batchSize)} (size: ${batch.length})...`);

    try {
      let results: any[] = [];
      if (mode === 'enrich') {
        results = await enrichBatch(batch);
      } else {
        results = await verifyBatch(batch);
      }

      // Merge results back
      for (const item of results) {
        const original = batch[item.id];
        if (!original) continue;

        const dbEntry = updatedDatabase.find(r => r.name === original.name);
        if (dbEntry) {
          if (mode === 'enrich') {
            dbEntry.notes = item.notes;
            dbEntry.price = item.price;
            dbEntry.cuisine = item.cuisine;
            dbEntry.enriched = true;
            dbEntry.hours = item.hours;
            console.log(`Enriched: ${dbEntry.name} (${dbEntry.cuisine})`);
          } else {
            if (!item.hoursCorrect && item.hours) {
              dbEntry.hours = item.hours;
              console.log(`Updated hours for: ${dbEntry.name}`);
            } else {
              console.log(`Hours verified correct for: ${dbEntry.name}`);
            }
          }
        }
        checkpoint.completedNames.push(original.name);
      }

      // Save checkpoints
      saveCheckpoint(checkpoint);

      // Save updated src/data.ts safely after each batch
      const dataFilePath = path.join(process.cwd(), 'src', 'data.ts');
      const tempFilePath = dataFilePath + '.tmp';
      const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(updatedDatabase))}
);
`;
      fs.writeFileSync(tempFilePath, fileContent, 'utf-8');
      fs.renameSync(tempFilePath, dataFilePath);

      console.log(`Progress saved to database.`);

      // Sleep between batches to respect rate limits
      if (i + batchSize < candidates.length) {
        console.log('Sleeping for 5 seconds to respect rate limits...');
        await sleep(5000);
      }

    } catch (err: any) {
      console.error(`Error processing batch:`, err.message || err);
      console.log('Saving checkpoint and exiting. Run the script again with --resume to continue.');
      process.exit(1);
    }
  }

  console.log(`\nMode ${mode.toUpperCase()} completed successfully!`);
}

main();
