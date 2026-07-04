import fs from 'fs';
import path from 'path';
import { Restaurant } from '../src/types';
import { restaurants } from '../src/data';

function getCanonicalName(name: string): string {
  const norm = name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');

  const prefixes = [
    { prefix: 'mcdonald', canonical: 'mcdonalds' },
    { prefix: 'uncork', canonical: 'uncorkd' },
    { prefix: 'guadalajara', canonical: 'guadalajaragrill' },
    { prefix: 'thecorktucson', canonical: 'thecork' },
    { prefix: 'thecork', canonical: 'thecork' },
    { prefix: 'corktucson', canonical: 'thecork' },
    { prefix: 'starbuck', canonical: 'starbucks' },
    { prefix: 'subway', canonical: 'subway' },
    { prefix: 'tacobell', canonical: 'tacobell' },
    { prefix: 'dutchbro', canonical: 'dutchbros' },
    { prefix: 'jerseymike', canonical: 'jerseymikes' },
    { prefix: 'dunkin', canonical: 'dunkin' },
    { prefix: 'domino', canonical: 'dominos' },
    { prefix: 'pizzahut', canonical: 'pizzahut' },
    { prefix: 'sonic', canonical: 'sonic' },
    { prefix: 'dairyqueen', canonical: 'dairyqueen' },
    { prefix: 'littlecaesar', canonical: 'littlecaesars' },
    { prefix: 'jackinthebox', canonical: 'jackinthebox' },
    { prefix: 'arby', canonical: 'arbys' },
    { prefix: 'panera', canonical: 'panera' },
    { prefix: 'chipotle', canonical: 'chipotle' },
    { prefix: 'pandaexpress', canonical: 'pandaexpress' },
    { prefix: 'chickfila', canonical: 'chickfila' },
    { prefix: 'fiveguy', canonical: 'fiveguys' },
    { prefix: 'whataburger', canonical: 'whataburger' },
    { prefix: 'jimmyjohn', canonical: 'jimmyjohns' },
    { prefix: 'elpolloloco', canonical: 'elpolloloco' },
    { prefix: 'denny', canonical: 'dennys' },
    { prefix: 'ihop', canonical: 'ihop' },
    { prefix: 'applebee', canonical: 'applebees' },
    { prefix: 'olivegarden', canonical: 'olivegarden' },
    { prefix: 'chili', canonical: 'chilis' },
    { prefix: 'firehousesub', canonical: 'firehousesubs' },
    { prefix: 'saladandgo', canonical: 'saladandgo' },
    { prefix: 'tridentgrill', canonical: 'tridentgrill' },
    { prefix: 'misssaigon', canonical: 'misssaigon' },
    { prefix: 'serialgriller', canonical: 'serialgrillers' },
    { prefix: 'elguerocanelo', canonical: 'elguerocanelo' },
    { prefix: 'eegee', canonical: 'eegees' }
  ];

  for (const p of prefixes) {
    if (norm.startsWith(p.prefix)) {
      return p.canonical;
    }
  }

  return norm;
}

function run() {
  const dataFilePath = path.join(process.cwd(), 'src', 'data.ts');
  const backupFilePath = dataFilePath + '.bak';

  console.log(`Loading database with ${restaurants.length} entries...`);

  // Create database backup
  fs.copyFileSync(dataFilePath, backupFilePath);
  console.log(`Database backup saved to src/data.ts.bak`);

  // Group by canonical name
  const groups = new Map<string, Restaurant[]>();

  for (const r of restaurants) {
    const canon = getCanonicalName(r.name);
    if (!groups.has(canon)) {
      groups.set(canon, []);
    }
    groups.get(canon)!.push(r);
  }

  const deduplicated: Restaurant[] = [];
  let removedCount = 0;

  for (const [canon, list] of groups.entries()) {
    // Sort group members by distance (ascending) to find the closest one
    list.sort((a, b) => a.distance - b.distance);

    // Keep the closest one
    const closest = list[0];
    deduplicated.push(closest);

    if (list.length > 1) {
      removedCount += (list.length - 1);
      console.log(`Deduplicated "${closest.name}": Keeping closest at ${closest.distance} mi (${closest.neighborhood}), removed ${list.length - 1} other locations.`);
    }
  }

  // Sort final database by distance (ascending)
  deduplicated.sort((a, b) => a.distance - b.distance);

  const fileContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(deduplicated))}
);
`;

  fs.writeFileSync(dataFilePath, fileContent, 'utf-8');
  console.log(`\nSuccessfully deduplicated!`);
  console.log(`Removed ${removedCount} duplicate locations.`);
  console.log(`Remaining unique restaurants: ${deduplicated.length}`);
}

run();
