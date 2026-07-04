import fs from 'fs';
import path from 'path';
import { restaurants as existingRestaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Helper to normalize names
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function main() {
  const closuresJsonPath = path.join(process.cwd(), 'proposed_closures.json');
  const closuresMdPath = path.join(process.cwd(), 'proposed_closures.md');
  const dataFilePath = path.join(process.cwd(), 'src', 'data.ts');
  const backupFilePath = dataFilePath + '.bak';

  if (!fs.existsSync(closuresJsonPath)) {
    console.log("No proposed_closures.json file found. Run audit-closures.ts first.");
    return;
  }

  let proposedClosures: Array<{ name: string; neighborhood: string; distance: number; evidence: string; searchQuery: string; verified: boolean }> = [];
  try {
    proposedClosures = JSON.parse(fs.readFileSync(closuresJsonPath, 'utf-8'));
  } catch (err) {
    console.error("Error: Could not parse proposed_closures.json.");
    process.exit(1);
  }

  // Filter for verified closed restaurants
  const verifiedClosures = proposedClosures.filter(c => c.verified === true);
  const pendingClosures = proposedClosures.filter(c => c.verified !== true);

  if (verifiedClosures.length === 0) {
    console.log("No restaurants have been marked as 'verified': true in proposed_closures.json.");
    console.log("Please review proposed_closures.json, mark verified closures as true, and run this script again.");
    return;
  }

  console.log(`Found ${verifiedClosures.length} verified closures to remove.`);
  verifiedClosures.forEach(c => console.log(` - Removing: ${c.name} (${c.neighborhood}, ${c.distance} mi)`));

  // Create a backup of data.ts before changing it
  fs.copyFileSync(dataFilePath, backupFilePath);
  console.log(`Backup of src/data.ts saved to src/data.ts.bak`);

  // Remove verified closed restaurants from the database
  const updatedDatabase: Restaurant[] = [];
  let removedCount = 0;

  for (const r of existingRestaurants) {
    const isClosed = verifiedClosures.some(c => 
      normalizeName(c.name) === normalizeName(r.name) && 
      Math.abs(c.distance - r.distance) < 0.15
    );

    if (isClosed) {
      removedCount++;
    } else {
      updatedDatabase.push(r);
    }
  }

  console.log(`Removed ${removedCount} restaurants from the active list.`);
  console.log(`Remaining restaurants in database: ${updatedDatabase.length}`);

  // Sort updated database by distance to keep it clean
  updatedDatabase.sort((a, b) => a.distance - b.distance);

  // Write database back to src/data.ts
  const tempFilePath = dataFilePath + '.tmp';
  const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(updatedDatabase))}
);
`;

  fs.writeFileSync(tempFilePath, fileContent, 'utf-8');
  fs.renameSync(tempFilePath, dataFilePath);
  console.log(`Successfully updated ${dataFilePath}!`);

  // Save the remaining pending closures back to proposed_closures.json
  fs.writeFileSync(closuresJsonPath, JSON.stringify(pendingClosures, null, 2), 'utf-8');
  console.log(`Updated proposed_closures.json (removed verified items).`);

  // Re-generate proposed_closures.md for remaining items
  if (pendingClosures.length > 0) {
    let mdContent = `# Proposed Closures Verification List\n\n`;
    mdContent += `We have audited the database and found **${pendingClosures.length}** restaurants that appear to be permanently closed on Google Maps or search results.\n\n`;
    mdContent += `### Instructions for Verification:\n`;
    mdContent += `1. Review the list below.\n`;
    mdContent += `2. Open [proposed_closures.json](file://${closuresJsonPath}) in your editor.\n`;
    mdContent += `3. For any restaurant that is indeed permanently closed, change \`"verified": false\` to \`"verified": true\`.\n`;
    mdContent += `4. Run \`npx tsx scripts/apply-closures.ts\` to remove verified closed restaurants from the database.\n\n`;
    mdContent += `| Status | Restaurant | Neighborhood | Distance | Evidence | Search Query Used |\n`;
    mdContent += `| :---: | :--- | :--- | :---: | :--- | :--- |\n`;

    for (const c of pendingClosures) {
      mdContent += `| ⏳ Pending Review | **${c.name}** | ${c.neighborhood} | ${c.distance} mi | ${c.evidence} | \`${c.searchQuery}\` |\n`;
    }
    fs.writeFileSync(closuresMdPath, mdContent, 'utf-8');
  } else {
    // Delete the md file if there are no pending closures
    if (fs.existsSync(closuresMdPath)) {
      fs.unlinkSync(closuresMdPath);
    }
    console.log("All proposed closures have been resolved. proposed_closures.md cleared.");
  }
}

main();
