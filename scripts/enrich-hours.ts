import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
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

function saveDatabase(list: Restaurant[]) {
  // Sort by distance to keep database organized
  const sorted = [...list].sort((a, b) => a.distance - b.distance);
  const dataFilePath = path.join(process.cwd(), 'src/data.ts');
  const fileContent = 'import { Restaurant } from \'./types\';\n\nexport const restaurants: Restaurant[] = ' + JSON.stringify(sorted, null, 2) + ';\n';
  fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
  console.log(`Saved progress: ${list.filter(r => r.hours).length} / ${list.length} restaurants enriched.`);
}

function deployChanges() {
  try {
    console.log("Deploying accumulated changes to GitHub...");
    execSync('git add src/data.ts', { stdio: 'inherit' });
    
    // Check if there are changes to commit
    const status = execSync('git status --porcelain src/data.ts').toString().trim();
    if (!status) {
      console.log("No new changes to commit.");
      return;
    }

    execSync('git commit -m "chore: update restaurant hours [skip ci]"', { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log("Successfully committed and pushed updates to remote repository.");
  } catch (err: any) {
    console.error("Failed to commit and deploy changes to git:", err.message || err);
  }
}

async function main() {
  // Dynamically load restaurants to get latest state
  const dataPath = path.resolve(process.cwd(), 'src/data.ts');
  
  // Since data.ts is written, we can read and parse it directly
  const dataContent = fs.readFileSync(dataPath, 'utf-8');
  // Extract JSON payload
  const jsonStart = dataContent.indexOf('export const restaurants: Restaurant[] = ');
  if (jsonStart === -1) {
    console.error("Error: Could not parse src/data.ts content.");
    process.exit(1);
  }
  const jsonText = dataContent.slice(jsonStart + 'export const restaurants: Restaurant[] = '.length).trim().replace(/;$/, '');
  const dbList = JSON.parse(jsonText) as Restaurant[];

  // Find restaurants without hours
  const pendingIndices = dbList
    .map((r, index) => ({ r, index }))
    .filter(item => !item.r.hours);

  if (pendingIndices.length === 0) {
    console.log("All restaurants already have hours populated!");
    process.exit(0);
  }

  console.log(`Found ${pendingIndices.length} restaurants pending hours enrichment.`);

  const batchSize = 30;
  let consecutiveRateLimits = 0;
  let exitDueToQuota = false;

  for (let i = 0; i < pendingIndices.length; i += batchSize) {
    const batchItems = pendingIndices.slice(i, i + batchSize);
    console.log(`Enriching batch ${i / batchSize + 1} of ${Math.ceil(pendingIndices.length / batchSize)} (size: ${batchItems.length})...`);

    const prompt = `You are a local Tucson food critic and database manager. Provide the actual weekly operating hours for these Tucson restaurants. 
If actual hours are not known, make a highly accurate estimate based on their category (e.g. diners open early, cafes close afternoon, bars open late, fast food open late/24h).

Return a JSON array in this schema:
[
  {
    "id": number,
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

Input:
${JSON.stringify(batchItems.map((item, index) => ({ id: index, name: item.r.name, cuisine: item.r.cuisine, neighborhood: item.r.neighborhood })))}`;

    let response = null;
    let attempts = 0;
    const maxAttempts = 5;
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
                  hours: {
                    type: 'OBJECT',
                    properties: {
                      Monday: { type: 'STRING' },
                      Tuesday: { type: 'STRING' },
                      Wednesday: { type: 'STRING' },
                      Thursday: { type: 'STRING' },
                      Friday: { type: 'STRING' },
                      Saturday: { type: 'STRING' },
                      Sunday: { type: 'STRING' }
                    },
                    required: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                  }
                },
                required: ['id', 'hours']
              }
            },
            tools: [{ googleSearch: {} }]
          }
        });
        success = true;
        consecutiveRateLimits = 0;
      } catch (err: any) {
        const isRateLimit = err.status === 429 || 
                            (err.message && err.message.includes('429')) || 
                            (err.message && err.message.toLowerCase().includes('quota exceeded')) ||
                            (err.message && err.message.toLowerCase().includes('rate limit'));
                            
        if (isRateLimit) {
          consecutiveRateLimits++;
          if (consecutiveRateLimits >= 3) {
            console.warn(`Hit consecutive rate limits ${consecutiveRateLimits} times. Quota exceeded. Committing and exiting to redeploy.`);
            exitDueToQuota = true;
            break;
          }
          
          let delayMs = Math.pow(2, attempts) * 2000 + Math.random() * 1000;
          if (err.message && err.message.includes('retry in')) {
            const match = err.message.match(/retry in ([\d\.]+)s/);
            if (match && match[1]) {
              delayMs = (parseFloat(match[1]) + 2) * 1000;
            }
          }
          console.warn(`Rate limit hit (429). Retrying in ${(delayMs / 1000).toFixed(1)} seconds... (Attempt ${attempts}/${maxAttempts})`);
          await sleep(delayMs);
        } else {
          console.error(`Gemini API call failed for batch (Attempt ${attempts}/${maxAttempts}):`, err.message || err);
          break;
        }
      }
    }

    if (exitDueToQuota) {
      break;
    }

    if (success && response) {
      try {
        const enrichedBatch = JSON.parse(response.text || '[]');
        for (const item of enrichedBatch) {
          const original = batchItems[item.id];
          if (original) {
            dbList[original.index].hours = item.hours;
          }
        }
        
        // Save progressively
        saveDatabase(dbList);
        
      } catch (jsonErr) {
        console.error("Failed to parse Gemini JSON response:", jsonErr);
      }
    } else {
      console.warn(`Failed to enrich batch ${i / batchSize + 1}. Skipping...`);
    }

    // Delay between batches to respect rate limits (3 seconds)
    await sleep(3000);
  }

  // After processing all batches or exiting due to quota, deploy changes
  deployChanges();

  if (exitDueToQuota) {
    console.log("Exited early due to quota limits. Will need to be rerun later.");
    process.exit(2); // Special exit code for quota hit
  } else {
    console.log("Enrichment completed successfully!");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Unhandle error in main:", err);
  process.exit(1);
});
