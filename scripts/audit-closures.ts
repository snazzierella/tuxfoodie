import fs from 'fs';
import path from 'path';
import { restaurants as existingRestaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Helper to normalize names (identical to update-data.ts)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to query DuckDuckGo Lite (text-only DDG)
async function searchDDGLite(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
      },
      body: `q=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      console.warn(`DDG Lite search failed for query: "${query}" with status ${response.status}`);
      return [];
    }

    const html = await response.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Regex to match search result links in DDG Lite:
    // <a rel="nofollow" href="[URL]" class='result-link'>[TITLE]</a>
    const regex = /<a[^>]*href=["']([^"']*)["'][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();

      // Find the snippet text following the link
      const searchFrom = html.indexOf(match[0]) + match[0].length;
      const snippetMatch = html.slice(searchFrom, searchFrom + 1500).match(/<td class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/i);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim() : '';

      results.push({ title, url, snippet });
    }

    return results;
  } catch (err: any) {
    console.error(`Error in searchDDGLite for query "${query}":`, err.message || err);
    return [];
  }
}

// Fetch article HTML and extract clean text
async function fetchCleanText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
      }
    });
    if (!response.ok) return '';
    const html = await response.text();

    // Remove scripts, styles, and HTML tags
    const clean = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');

    return clean;
  } catch (err: any) {
    console.warn(`Failed to fetch clean text from URL ${url}:`, err.message || err);
    return '';
  }
}

const CLOSURE_KEYWORDS = [
  'permanently closed',
  'closed permanently',
  'closed its doors',
  'shut down',
  'shutting down',
  'closes doors',
  'closing its doors',
  'out of business',
  'no longer in business',
  'has closed',
  'permanently shut'
];

async function main() {
  const args = process.argv.slice(2);
  const allIndex = args.indexOf('--all');
  const auditAll = allIndex !== -1;

  console.log("Starting Keyless Database Closure Audit using DDG Lite...");
  
  const closuresJsonPath = path.join(process.cwd(), 'proposed_closures.json');
  const closuresMdPath = path.join(process.cwd(), 'proposed_closures.md');

  // Load existing proposed closures to preserve user verifications
  let existingClosures: Array<{ name: string; neighborhood: string; distance: number; evidence: string; searchQuery: string; verified: boolean }> = [];
  if (fs.existsSync(closuresJsonPath)) {
    try {
      const content = fs.readFileSync(closuresJsonPath, 'utf-8');
      if (content.trim()) {
        existingClosures = JSON.parse(content);
        console.log(`Loaded ${existingClosures.length} existing proposed closures to preserve verifications.`);
      }
    } catch (err) {
      console.warn("Could not parse existing proposed_closures.json. Starting fresh.");
    }
  }

  // Phase 1: Search for Tucson closure news and roundups
  console.log("\n--- Phase 1: Searching for Tucson restaurant closure articles ---");
  const queries = [
    'site:tucsonfoodie.com "permanently closed" OR "closed" OR "closing" 2026',
    'site:tucsonfoodie.com "permanently closed" OR "closed" OR "closing" 2025',
    'site:tucsonfoodie.com "permanently closed" OR "closed" OR "closing" 2024',
    'site:thisistucson.com "closed" OR "closing" 2025 OR 2026',
    'site:tucson.com "permanently closed" OR "closed its doors" 2025 OR 2026'
  ];

  const articleUrls = new Set<string>();

  for (const q of queries) {
    console.log(`Searching DDG Lite for: "${q}"`);
    const searchResults = await searchDDGLite(q);
    searchResults.forEach(r => {
      // Filter out non-article pages or tag pages
      if (
        (r.url.includes('tucsonfoodie.com') || r.url.includes('thisistucson.com') || r.url.includes('tucson.com')) &&
        !r.url.includes('/tag/') &&
        !r.url.includes('/category/') &&
        !r.url.endsWith('tucsonfoodie.com/') &&
        !r.url.endsWith('thisistucson.com/') &&
        !r.url.endsWith('tucson.com/')
      ) {
        articleUrls.add(r.url);
      }
    });
    await sleep(2000); // Friendly rate-limiting
  }

  console.log(`Found ${articleUrls.size} unique article URLs to scrape.`);

  // Scrape article text
  console.log("\n--- Phase 2: Scraping articles and matching names ---");
  let combinedArticleText = '';
  let articleCount = 0;
  for (const url of articleUrls) {
    articleCount++;
    console.log(`[${articleCount}/${articleUrls.size}] Scraping: ${url}`);
    const text = await fetchCleanText(url);
    combinedArticleText += ' ' + text;
    await sleep(1500); // Friendly rate-limiting
  }

  // Find candidate restaurants in the text
  const candidates: Restaurant[] = [];
  const normalizedText = combinedArticleText.toLowerCase();

  for (const r of existingRestaurants) {
    if (!auditAll && r.isLocal === false) continue;

    const normName = r.name.toLowerCase().trim();
    if (normName.length < 3) continue; // Skip too-short names

    // Word boundary match
    // Escape regex characters
    const escapedName = normName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'i');

    if (regex.test(normalizedText)) {
      candidates.push(r);
    }
  }

  console.log(`\nFound ${candidates.length} restaurant candidates mentioned in closure news.`);
  candidates.forEach(c => console.log(` - Candidate: ${c.name} (${c.neighborhood})`));

  // Phase 2: Double-verify candidates individually
  console.log("\n--- Phase 3: Verifying candidates individually ---");
  const confirmedClosed: Array<{ name: string; neighborhood: string; distance: number; evidence: string; searchQuery: string; verified: boolean }> = [];

  let count = 0;
  for (const r of candidates) {
    count++;
    console.log(`[${count}/${candidates.length}] Verifying status for: "${r.name}" (${r.neighborhood})`);
    
    const query = `"${r.name}" Tucson permanently closed`;
    const searchResults = await searchDDGLite(query);
    
    // Check search results for closure keywords
    let closedEvidence = '';
    let matchesClosed = false;

    // Look at top 3 results
    const topResults = searchResults.slice(0, 3);
    for (const res of topResults) {
      const titleLower = res.title.toLowerCase();
      const snippetLower = res.snippet.toLowerCase();
      
      const containsClosureWord = CLOSURE_KEYWORDS.some(kw => 
        titleLower.includes(kw) || snippetLower.includes(kw)
      );

      const containsName = r.name.split(' ').some(word => {
        const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        return w.length > 2 && (titleLower.includes(w) || snippetLower.includes(w));
      });

      if (containsClosureWord && containsName) {
        matchesClosed = true;
        closedEvidence = `Found in result: "${res.title}" - ${res.snippet}`;
        break;
      }
    }

    if (matchesClosed) {
      // Check if it's already verified in existing proposed closures
      const existing = existingClosures.find(e => normalizeName(e.name) === normalizeName(r.name) && Math.abs(e.distance - r.distance) < 0.1);
      
      confirmedClosed.push({
        name: r.name,
        neighborhood: r.neighborhood,
        distance: r.distance,
        evidence: closedEvidence,
        searchQuery: query,
        verified: existing ? existing.verified : false
      });
      console.log(`   -> [CLOSED] Evidence: ${closedEvidence}`);
    } else {
      console.log(`   -> [OPEN] Appears active or search ambiguous.`);
    }

    await sleep(2000); // Friendly rate-limiting
  }

  // Update proposed_closures.json and proposed_closures.md
  updateClosuresFiles(confirmedClosed, closuresJsonPath, closuresMdPath);

  console.log(`\nAudit completed! Found ${confirmedClosed.length} suspected closures.`);
  console.log(`Please review proposed_closures.json and proposed_closures.md.`);
}

function updateClosuresFiles(
  closures: Array<{ name: string; neighborhood: string; distance: number; evidence: string; searchQuery: string; verified: boolean }>,
  jsonPath: string,
  mdPath: string
) {
  // Save JSON
  fs.writeFileSync(jsonPath, JSON.stringify(closures, null, 2), 'utf-8');

  // Generate MD
  let mdContent = `# Proposed Closures Verification List\n\n`;
  mdContent += `We have audited the database and found **${closures.length}** restaurants that appear to be permanently closed on Google Maps or search results.\n\n`;
  mdContent += `### Instructions for Verification:\n`;
  mdContent += `1. Review the list below.\n`;
  mdContent += `2. Open [proposed_closures.json](file://${jsonPath}) in your editor.\n`;
  mdContent += `3. For any restaurant that is indeed permanently closed, change \`"verified": false\` to \`"verified": true\`.\n`;
  mdContent += `4. Run \`npx tsx scripts/apply-closures.ts\` to remove verified closed restaurants from the database.\n\n`;
  mdContent += `| Status | Restaurant | Neighborhood | Distance | Evidence | Search Query Used |\n`;
  mdContent += `| :---: | :--- | :--- | :---: | :--- | :--- |\n`;

  for (const c of closures) {
    const statusBox = c.verified ? '✅ Verified Closed' : '⏳ Pending Review';
    mdContent += `| ${statusBox} | **${c.name}** | ${c.neighborhood} | ${c.distance} mi | ${c.evidence} | \`${c.searchQuery}\` |\n`;
  }

  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`Successfully updated ${jsonPath} and ${mdPath}!`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
