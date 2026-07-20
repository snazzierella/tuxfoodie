import fs from 'fs';
import path from 'path';
import { restaurants as existingRestaurants } from '../src/data';
import { Restaurant } from '../src/types';

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function main() {
  const openingsJsonPath = path.join(process.cwd(), 'proposed_openings.json');
  const openingsMdPath = path.join(process.cwd(), 'proposed_openings.md');
  const dataFilePath = path.join(process.cwd(), 'src', 'data.ts');
  const prettyFilePath = path.join(process.cwd(), 'src', 'database_pretty.json');
  const backupFilePath = dataFilePath + '.bak';

  if (!fs.existsSync(openingsJsonPath)) {
    console.log("No proposed_openings.json file found. Run audit-openings-gemini.ts first.");
    return;
  }

  let proposedOpenings: any[] = [];
  try {
    proposedOpenings = JSON.parse(fs.readFileSync(openingsJsonPath, 'utf-8'));
  } catch (err) {
    console.error("Error: Could not parse proposed_openings.json.");
    process.exit(1);
  }

  // Filter for verified openings
  const verifiedOpenings = proposedOpenings.filter(o => o.verified === true);
  const pendingOpenings = proposedOpenings.filter(o => o.verified !== true);

  if (verifiedOpenings.length === 0) {
    console.log("No openings have been marked as 'verified': true in proposed_openings.json.");
    console.log("Please review proposed_openings.json, mark verified openings as true, and run this script again.");
    return;
  }

  console.log(`Found ${verifiedOpenings.length} verified openings to add.`);
  verifiedOpenings.forEach(o => console.log(` - Adding: ${o.name} (${o.neighborhood}, ${o.distance} mi)`));

  // Backup data.ts
  fs.copyFileSync(dataFilePath, backupFilePath);
  console.log(`Backup of src/data.ts saved to src/data.ts.bak`);

  // Build the updated database
  const updatedDatabase = [...existingRestaurants] as Restaurant[];

  for (const newOp of verifiedOpenings) {
    const norm = normalizeName(newOp.name);
    const exists = updatedDatabase.some(r => 
      normalizeName(r.name) === norm && 
      Math.abs(r.distance - newOp.distance) < 0.15
    );

    if (!exists) {
      const entry: Restaurant = {
        name: newOp.name,
        cuisine: newOp.cuisine,
        neighborhood: newOp.neighborhood,
        distance: newOp.distance,
        price: newOp.price,
        notes: newOp.notes,
        isLocal: newOp.isLocal,
        enriched: newOp.enriched,
        hours: newOp.hours,
        manuallyAdded: true // Mark as manually added/verified
      };
      updatedDatabase.push(entry);
    }
  }

  // Sort updated database by distance
  updatedDatabase.sort((a, b) => a.distance - b.distance);

  // Save to src/data.ts
  const tempFilePath = dataFilePath + '.tmp';
  const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(updatedDatabase))}
);
`;

  fs.writeFileSync(tempFilePath, fileContent, 'utf-8');
  fs.renameSync(tempFilePath, dataFilePath);
  console.log(`Successfully updated ${dataFilePath}!`);

  // Save to src/database_pretty.json
  fs.writeFileSync(prettyFilePath, JSON.stringify(updatedDatabase, null, 2), 'utf-8');
  console.log(`Successfully updated ${prettyFilePath}!`);

  // Save remaining pending openings back to proposed_openings.json
  fs.writeFileSync(openingsJsonPath, JSON.stringify(pendingOpenings, null, 2), 'utf-8');
  console.log(`Updated proposed_openings.json (removed applied items).`);

  // Re-generate proposed_openings.md
  if (pendingOpenings.length > 0) {
    let mdContent = `# Proposed New Openings Verification List\n\n`;
    mdContent += `We have scanned local dining news and found **${pendingOpenings.length}** newly opened restaurants not yet in the active database.\n\n`;
    mdContent += `### Instructions for Verification:\n`;
    mdContent += `1. Review the list below.\n`;
    mdContent += `2. Open [proposed_openings.json](file://${openingsJsonPath}) in your editor.\n`;
    mdContent += `3. For any restaurant that you wish to add to the active database, change \`"verified": false\` to \`"verified": true\`.\n`;
    mdContent += `4. Run \`npx tsx scripts/apply-openings.ts\` to apply verified new openings to the database.\n\n`;
    mdContent += `| Status | Restaurant | Cuisine | Neighborhood | Distance | Address | Notes |\n`;
    mdContent += `| :---: | :--- | :--- | :--- | :---: | :--- | :--- |\n`;

    for (const o of pendingOpenings) {
      mdContent += `| ⏳ Pending Review | **${o.name}** | ${o.cuisine} | ${o.neighborhood} | ${o.distance} mi | ${o.address} | ${o.notes} |\n`;
    }
    fs.writeFileSync(openingsMdPath, mdContent, 'utf-8');
  } else {
    if (fs.existsSync(openingsMdPath)) {
      fs.unlinkSync(openingsMdPath);
    }
    console.log("All proposed openings have been resolved. proposed_openings.md cleared.");
  }
}

main();
