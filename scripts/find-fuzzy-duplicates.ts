import fs from 'fs';
import path from 'path';
import { restaurants } from '../src/data';
import { Restaurant } from '../src/types';

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "");
}

function getSimilarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return 1.0;
  
  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - dist / maxLen;
}

interface DuplicateCandidate {
  r1: Restaurant;
  r2: Restaurant;
  reason: string;
  similarity: number;
}

function main() {
  const candidates: DuplicateCandidate[] = [];
  
  for (let i = 0; i < restaurants.length; i++) {
    for (let j = i + 1; j < restaurants.length; j++) {
      const r1 = restaurants[i];
      const r2 = restaurants[j];
      
      const sim = getSimilarity(r1.name, r2.name);
      const sameDist = Math.abs(r1.distance - r2.distance) < 0.05;
      const sameNeighborhood = r1.neighborhood === r2.neighborhood;
      
      // Case 1: Extremely similar names and very close in distance/neighborhood
      if (sim > 0.8 && sameDist && sameNeighborhood) {
        candidates.push({
          r1,
          r2,
          reason: 'Highly similar name and same location/neighborhood',
          similarity: sim
        });
      }
      // Case 2: Exact same name and location
      else if (normalize(r1.name) === normalize(r2.name) && sameDist) {
        candidates.push({
          r1,
          r2,
          reason: 'Identical name and similar location',
          similarity: 1.0
        });
      }
      // Case 3: One name is substring of another and same location
      else if (sameDist && sameNeighborhood && (normalize(r1.name).includes(normalize(r2.name)) || normalize(r2.name).includes(normalize(r1.name)))) {
        // Only if length difference is not huge
        const lenDiff = Math.abs(r1.name.length - r2.name.length);
        if (lenDiff < 10) {
          candidates.push({
            r1,
            r2,
            reason: 'One name contains the other and same location',
            similarity: 0.75
          });
        }
      }
      // Case 4: Same distance and neighborhood, but slightly different names (e.g. typo or alt name)
      else if (sameDist && r1.distance > 0 && sameNeighborhood && sim > 0.6) {
        candidates.push({
          r1,
          r2,
          reason: 'Similar distance/neighborhood and moderately similar name',
          similarity: sim
        });
      }
    }
  }

  console.log(`Found ${candidates.length} potential duplicate pairs:\n`);
  candidates.forEach((c, index) => {
    console.log(`Pair #${index + 1} (Reason: ${c.reason}, Similarity: ${(c.similarity * 100).toFixed(1)}%)`);
    console.log(`  1: "${c.r1.name}" in ${c.r1.neighborhood} (dist: ${c.r1.distance} mi, cuisine: ${c.r1.cuisine})`);
    console.log(`  2: "${c.r2.name}" in ${c.r2.neighborhood} (dist: ${c.r2.distance} mi, cuisine: ${c.r2.cuisine})`);
    console.log();
  });
}

main();
