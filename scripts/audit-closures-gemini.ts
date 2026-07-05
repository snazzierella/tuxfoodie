import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { restaurants } from '../src/data';
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

const AUDIT_PROGRESS_FILE = path.join(process.cwd(), 'scratch', 'audit_closures_progress.json');
const SUSPECTED_CLOSURES_FILE = path.join(process.cwd(), 'proposed_closures.json');
const SUSPECTED_CLOSURES_MD = path.join(process.cwd(), 'proposed_closures.md');

interface AuditedState {
  processedNames: string[];
  suspectedClosures: Array<{
    name: string;
    neighborhood: string;
    distance: number;
    evidence: string;
    searchQuery: string;
    verified: boolean;
  }>;
}

function loadState(): AuditedState {
  if (fs.existsSync(AUDIT_PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUDIT_PROGRESS_FILE, 'utf-8'));
    } catch (_) {}
  }
  
  // Try loading existing proposed closures to pre-populate suspected closures list
  let suspectedClosures: any[] = [];
  if (fs.existsSync(SUSPECTED_CLOSURES_FILE)) {
    try {
      suspectedClosures = JSON.parse(fs.readFileSync(SUSPECTED_CLOSURES_FILE, 'utf-8'));
    } catch (_) {}
  }

  return {
    processedNames: [],
    suspectedClosures
  };
}

function saveState(state: AuditedState) {
  const dir = path.dirname(AUDIT_PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(AUDIT_PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function updateClosuresFiles(closures: AuditedState['suspectedClosures']) {
  // Save JSON
  fs.writeFileSync(SUSPECTED_CLOSURES_FILE, JSON.stringify(closures, null, 2), 'utf-8');

  // Generate MD
  let mdContent = `# Proposed Closures Verification List\n\n`;
  mdContent += `We have audited the database and found **${closures.length}** restaurants that appear to be permanently closed on Google Maps or search results.\n\n`;
  mdContent += `### Instructions for Verification:\n`;
  mdContent += `1. Review the list below.\n`;
  mdContent += `2. Open [proposed_closures.json](file://${SUSPECTED_CLOSURES_FILE}) in your editor.\n`;
  mdContent += `3. For any restaurant that is indeed permanently closed, change \`"verified": false\` to \`"verified": true\`.\n`;
  mdContent += `4. Run \`npx tsx scripts/apply-closures.ts\` to remove verified closed restaurants from the database.\n\n`;
  mdContent += `| Status | Restaurant | Neighborhood | Distance | Evidence | Search Query Used |\n`;
  mdContent += `| :---: | :--- | :--- | :---: | :--- | :--- |\n`;

  for (const c of closures) {
    const statusBox = c.verified ? '✅ Verified Closed' : '⏳ Pending Review';
    mdContent += `| ${statusBox} | **${c.name}** | ${c.neighborhood} | ${c.distance} mi | ${c.evidence} | \`${c.searchQuery}\` |\n`;
  }

  fs.writeFileSync(SUSPECTED_CLOSURES_MD, mdContent, 'utf-8');
  console.log(`Updated ${SUSPECTED_CLOSURES_FILE} and ${SUSPECTED_CLOSURES_MD}`);
}

async function verifyBatch(batch: Restaurant[]): Promise<any[]> {
  const prompt = `You are a local Tucson dining database auditor. Review the following restaurants in Tucson, Arizona.
For each restaurant, perform a Google Search to check if the restaurant is PERMANENTLY CLOSED (out of business, shut down permanently).
Do NOT flag a restaurant as closed if it is only temporarily closed, relocated (unless closed at the current address), or has changed hours.

Return ONLY a JSON array wrapped in a markdown json code block (e.g. \`\`\`json [ ... ] \`\`\`) matching this schema:
[
  {
    "id": number,
    "closed": boolean,
    "evidence": string
  }
]

Provide clear, specific evidence (e.g. "Google Maps lists as permanently closed", "Yelp lists as closed", or "News article from Tucson Foodie in 2024 states it is closed"). If it is open, set closed to false and evidence to "Open".

Input list:
${JSON.stringify(batch.map((r, index) => ({ id: index, name: r.name, neighborhood: r.neighborhood })))}`;

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
  
  if (reset && fs.existsSync(AUDIT_PROGRESS_FILE)) {
    fs.unlinkSync(AUDIT_PROGRESS_FILE);
    console.log("Reset progress file.");
  }

  const state = loadState();

  // Handle redoing specific batches (1-indexed, as printed in logs)
  const redoArgIndex = args.indexOf('--redo-batches');
  if (redoArgIndex !== -1 && args[redoArgIndex + 1]) {
    const redoBatches = args[redoArgIndex + 1].split(',').map(num => parseInt(num.trim(), 10) - 1);
    console.log(`Requested to redo batches (1-indexed): ${args[redoArgIndex + 1]}`);
    const batchSize = 35;
    
    const redoNames = new Set<string>();
    for (const b of redoBatches) {
      if (b < 0) continue;
      const startIndex = b * batchSize;
      const endIndex = (b + 1) * batchSize;
      const batchRestaurants = restaurants.slice(startIndex, endIndex);
      batchRestaurants.forEach(r => redoNames.add(r.name));
    }
    
    console.log(`Clearing processed status and suspected closures for ${redoNames.size} restaurants from requested batches.`);
    state.processedNames = state.processedNames.filter(n => !redoNames.has(n));
    state.suspectedClosures = state.suspectedClosures.filter(c => !redoNames.has(c.name));
    
    saveState(state);
    updateClosuresFiles(state.suspectedClosures);
  }

  console.log(`Loaded audit state. Processed restaurants: ${state.processedNames.length}/${restaurants.length}`);
  console.log(`Current suspected closures count: ${state.suspectedClosures.length}`);

  // Filter restaurants that haven't been processed yet
  const pending = restaurants.filter(r => !state.processedNames.includes(r.name));

  if (pending.length === 0) {
    console.log("All restaurants have already been audited!");
    updateClosuresFiles(state.suspectedClosures);
    process.exit(0);
  }

  console.log(`Pending audit: ${pending.length} restaurants.`);

  const batchSize = 35;
  
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    console.log(`Auditing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(pending.length / batchSize)} (size: ${batch.length})...`);

    let results: any[] = [];
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        results = await verifyBatch(batch);
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
      // Safeguard: Check if this batch has generic/corrupted closure evidence
      let totalClosed = 0;
      let genericClosed = 0;
      for (const item of results) {
        if (item.closed) {
          totalClosed++;
          const evidence = (item.evidence || "").toLowerCase();
          const isGeneric = 
            evidence.includes("google maps lists") || 
            evidence.includes("listed as permanently closed on google maps") ||
            evidence.includes("permanently closed on google maps") ||
            (evidence.includes("google maps") && evidence.includes("permanently closed") && evidence.length < 100);
          if (isGeneric) {
            genericClosed++;
          }
        }
      }

      const isCorrupted = totalClosed >= 5 && (genericClosed / totalClosed) >= 0.8;
      if (isCorrupted) {
        console.warn(`\n⚠️ WARNING: Batch appears to have corrupted/generic closure responses (${genericClosed}/${totalClosed} closures are generic). Skipping this batch to redo in the next run.\n`);
        
        if (i + batchSize < pending.length) {
          console.log("Sleeping 6 seconds to prevent rate limits...");
          await sleep(6000);
        }
        continue;
      }

      for (const item of results) {
        const original = batch[item.id];
        if (!original) continue;

        state.processedNames.push(original.name);

        if (item.closed) {
          console.log(`🚨 SUSPECTED CLOSED: "${original.name}" (${original.neighborhood}) - Evidence: ${item.evidence}`);
          
          // Check if already in suspected closures
          const exists = state.suspectedClosures.some(c => c.name === original.name && Math.abs(c.distance - original.distance) < 0.1);
          if (!exists) {
            state.suspectedClosures.push({
              name: original.name,
              neighborhood: original.neighborhood,
              distance: original.distance,
              evidence: item.evidence,
              searchQuery: `Google Search for "${original.name}" Tucson`,
              verified: false
            });
          }
        }
      }

      // Save state progressively
      saveState(state);
      updateClosuresFiles(state.suspectedClosures);

      if (i + batchSize < pending.length) {
        console.log("Sleeping 6 seconds to prevent rate limits...");
        await sleep(6000);
      }
    } else {
      console.error(`Failed to verify batch starting at index ${i}. Saving state and exiting.`);
      saveState(state);
      process.exit(1);
    }
  }

  console.log("\nClosure audit completed successfully!");
  console.log(`Total suspected closures found: ${state.suspectedClosures.length}`);
  console.log(`Please inspect proposed_closures.md and proposed_closures.json`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
