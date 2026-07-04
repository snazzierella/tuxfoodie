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
    { prefix: 'eegee', canonical: 'eegees' },
    { prefix: 'raisingcane', canonical: 'raisingcanes' },
    { prefix: 'streettaco', canonical: 'streettaco' },
    { prefix: 'whatscookin', canonical: 'whatscookin' },
    { prefix: 'hungryhowie', canonical: 'hungryhowie' },
    { prefix: 'mamasfamous', canonical: 'mamasfamous' },
    { prefix: 'frankiescheese', canonical: 'frankiescheesesteaks' },
    { prefix: 'frankiecheese', canonical: 'frankiescheesesteaks' },
    { prefix: 'kababeque', canonical: 'kababeque' },
    { prefix: 'snakeslattes', canonical: 'snakesandlattes' },
    { prefix: 'snakesandlattes', canonical: 'snakesandlattes' },
    { prefix: 'gentleben', canonical: 'gentlebens' },
    { prefix: 'geronimo', canonical: 'geronimo' },
    { prefix: 'govinda', canonical: 'govindas' },
    { prefix: 'thebuffet', canonical: 'thebuffet' },
    { prefix: 'goldencor', canonical: 'goldencorral' },
    { prefix: 'surlywench', canonical: 'surlywench' },
    { prefix: 'martinscomida', canonical: 'martinscomida' },
    { prefix: 'brooklynpizza', canonical: 'brooklynpizza' },
    { prefix: 'crookedtooth', canonical: 'crookedtooth' },
    { prefix: 'sauce', canonical: 'sauce' },
    { prefix: 'berrygreens', canonical: 'berrygreens' },
    { prefix: 'playground', canonical: 'playground' },
    { prefix: 'empirepizza', canonical: 'empirepizza' },
    { prefix: 'kintoki', canonical: 'kintoki' },
    { prefix: 'reilly', canonical: 'reilly' },
    { prefix: 'elevencafe', canonical: 'elevencafe' },
    { prefix: 'percheno', canonical: 'percheno' },
    { prefix: 'fruitshack', canonical: 'fruitshack' },
    { prefix: 'jerrybob', canonical: 'jerrybobs' },
    { prefix: 'daostaipan', canonical: 'daostaipan' },
    { prefix: 'decibel', canonical: 'decibel' },
    { prefix: 'desertdrifter', canonical: 'desertdrifter' },
    { prefix: 'pinnaclepeak', canonical: 'pinnaclepeak' },
    { prefix: 'churrasco', canonical: 'churrasco' },
    { prefix: 'pocomom', canonical: 'pocomoms' },
    { prefix: 'famoussam', canonical: 'famoussams' },
    { prefix: 'piazzagavi', canonical: 'piazzagavi' },
    { prefix: 'sushicortaro', canonical: 'sushicortaro' },
    { prefix: 'roadrunnercoffee', canonical: 'roadrunnercoffee' },
    { prefix: 'losbeto', canonical: 'losbetos' },
    { prefix: 'arizonapizza', canonical: 'arizonapizza' },
    { prefix: 'threecanyon', canonical: 'threecanyon' },
    { prefix: 'chinesecombo', canonical: 'chinesecombo' },
    { prefix: 'bottegamichelangelo', canonical: 'bottegamichelangelo' },
    { prefix: 'saguarocorners', canonical: 'saguarocorners' },
    { prefix: 'gmgchinese', canonical: 'gmgchinese' },
    { prefix: 'tropicalsmoothie', canonical: 'tropicalsmoothie' },
    { prefix: 'luckiesthai', canonical: 'luckiesthai' },
    { prefix: 'theviews', canonical: 'theviews' },
    { prefix: 'montgomery', canonical: 'montgomery' },
    { prefix: 'twogirlspizzeria', canonical: 'twogirlspizzeria' },
    { prefix: 'scentedleaf', canonical: 'scentedleaf' },
    { prefix: 'heemeecoffee', canonical: 'heemeecoffee' },
    { prefix: 'barriobrewing', canonical: 'barriobrewing' }
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
