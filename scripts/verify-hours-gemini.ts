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

const VERIFY_PROGRESS_FILE = path.join(process.cwd(), 'scratch', 'verify_hours_progress.json');

interface VerifyState {
  verifiedNames: string[];
}

function loadState(): VerifyState {
  if (fs.existsSync(VERIFY_PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VERIFY_PROGRESS_FILE, 'utf-8'));
    } catch (_) {}
  }
  return { verifiedNames: [] };
}

function saveState(state: VerifyState) {
  const dir = path.dirname(VERIFY_PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(VERIFY_PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function verifyHoursBatch(batch: Restaurant[]): Promise<any[]> {
  const prompt = `You are a local Tucson dining database auditor. Review the following restaurants in Tucson, Arizona.
For each restaurant, perform a Google Search to find its current weekly operating hours.
Compare it to our current hours. If our current hours are missing or incorrect, provide the correct hours.
If the restaurant is permanently closed, set "closed" to true.

Return ONLY a JSON array wrapped in a markdown json code block (e.g. \`\`\`json [ ... ] \`\`\`) matching this schema:
[
  {
    "id": number,
    "hoursCorrect": boolean,
    "closed": boolean,
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
]

Format for hours must be "11:00 AM - 9:00 PM" (or other time range), "Closed", or "24 Hours". If multiple ranges apply, separate them with a comma (e.g. "11:00 AM - 3:00 PM, 5:00 PM - 10:00 PM").

Input list (with current hours):
${JSON.stringify(batch.map((r, index) => ({ id: index, name: r.name, neighborhood: r.neighborhood, currentHours: r.hours })))}`;

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
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  if (reset && fs.existsSync(VERIFY_PROGRESS_FILE)) {
    fs.unlinkSync(VERIFY_PROGRESS_FILE);
    console.log("Reset verification progress file.");
  }

  const state = loadState();
  const dbList = [...existingRestaurants] as Restaurant[];

  // Filter restaurants that haven't been verified yet
  const pending = dbList.filter(r => !state.verifiedNames.includes(r.name));

  if (pending.length === 0) {
    console.log("All restaurants operating hours have been verified!");
    process.exit(0);
  }

  console.log(`Starting operating hours verification. Pending: ${pending.length} / ${dbList.length}`);

  const batchSize = 30;

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    console.log(`Verifying batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(pending.length / batchSize)} (size: ${batch.length})...`);

    let results: any[] = [];
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        results = await verifyHoursBatch(batch);
        success = true;
      } catch (err: any) {
        console.error(`Attempt ${attempts} failed:`, err.message || err);
        if (attempts < maxAttempts) {
          const delay = attempts * 10000;
          console.log(`Sleeping for ${delay / 1000}s before retrying...`);
          await sleep(delay);
        }
      }
    }

    if (success) {
      for (const item of results) {
        const original = batch[item.id];
        if (!original) continue;

        const dbEntry = dbList.find(r => r.name === original.name);
        if (dbEntry) {
          if (item.closed) {
            console.log(`🚨 flagged Closed during hours check: ${dbEntry.name}`);
            // Mark as proposed closed in database
            (dbEntry as any).closedProposed = true;
          } else if (!item.hoursCorrect && item.hours) {
            console.log(`📝 Corrected hours for: ${dbEntry.name}`);
            dbEntry.hours = item.hours;
          } else {
            console.log(`✅ Hours correct: ${dbEntry.name}`);
          }
          state.verifiedNames.push(original.name);
        }
      }

      // Save progress to database
      const dataFilePath = path.join(process.cwd(), 'src', 'data.ts');
      const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(dbList))}
);
`;
      fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
      
      // Save verification state
      saveState(state);
      console.log(`Progress saved to database.`);

      if (i + batchSize < pending.length) {
        console.log("Sleeping 6 seconds to prevent rate limits...");
        await sleep(6000);
      }
    } else {
      console.error(`Failed to verify hours for batch starting at index ${i}. Exiting.`);
      process.exit(1);
    }
  }

  console.log("\nOperating hours verification completed successfully!");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
