import fs from 'fs';
import path from 'path';
import { Restaurant } from '../src/types';

const AUDIT_PATH = path.join(process.cwd(), 'Gemini assist file', 'proposed_hours_changes_all.json');
const PRETTY_PATH = path.join(process.cwd(), 'src', 'database_pretty.json');
const DATA_TS_PATH = path.join(process.cwd(), 'src', 'data.ts');
const BAK_PATH = path.join(process.cwd(), 'src', 'database_pretty.json.bak');

interface AuditChange {
  index: number;
  name: string;
  action: string;
  verified_address: string | null;
  source_url: string | null;
  current_hours: Record<string, string> | null;
  corrected_hours: Record<string, string> | null;
  note: string | null;
}

interface AuditData {
  source_database: string;
  total_entries: number;
  correct_count: number;
  changes_count: number;
  action_breakdown: Record<string, number>;
  location_reference: string;
  changes: AuditChange[];
}

function main() {
  console.log('Loading original database backup and audit file...');
  // Load from .bak to guarantee we start from the clean, original 937 entries
  const existingDb: Restaurant[] = JSON.parse(fs.readFileSync(BAK_PATH, 'utf8'));
  const audit: AuditData = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));

  console.log(`Initial database count: ${existingDb.length}`);
  console.log(`Audit total changes: ${audit.changes.length}`);

  // Build name-to-change mapping
  const changesMap = new Map<string, AuditChange>();
  for (const change of audit.changes) {
    changesMap.set(change.name.toLowerCase().trim(), change);
  }

  // 28 truly permanently closed (with confirmed evidence and no remaining active locations in Tucson):
  const trulyPermanentlyClosed = [
    'on deck',
    'saffron bites',
    "ike's love and sandwiches",
    'the taco shop co.',
    'hello cafe',
    'the drunken chicken',
    'zyka twist',
    'bunny ciao',
    'el taquito king',
    'mariscos mi mazatlán',
    'lucky panda',
    'pelio grill',
    'solid grindz',
    'sushi iii',
    'katsu house',
    'proper shops bar',
    'studio janos',
    'el brunch bistro',
    'food street kitchen',
    'cafe con leche',
    'three canyon beer and wine garden',
    'the horseshoe grill',
    "lucky's chicago sandwiches",
    "mcgraw's cantina restaurant",
    'cheers to you!',
    'del lago golf club',
    "angela's mexican"
  ];

  // 9 confirmed phantom / invalid / duplicate / closed edge cases:
  const invalidOrDuplicate = [
    'sugar skull cakes',   // phantom residential listing from real-estate data
    'quiznos',             // 2601 E Speedway permanently closed; no other Tucson locations
    'smoothie factory',    // 1031 N Park Ave permanently closed
    'zion city',           // non-restaurant church
    'mariscos san juan',   // phantom / non-existent vendor in Tucson
    'catalina dining',     // private club members only at Ventana Canyon Club
    'garden bistro',       // exact duplicate of Tohono Chul Bistro
    'hidden grill',        // permanently closed 2019/2020
    'surf thru express'    // non-restaurant car wash
  ];

  // Angie's consolidation: Angie's Lobster is removed as a duplicate because all Angie's locations
  // are consolidated into "Angie's: The New Fast Food" at the nearest location (3805 E Broadway).
  const consolidatedDuplicate = [
    "angie's lobster"
  ];

  const namesToDelete = new Set<string>([
    ...trulyPermanentlyClosed,
    ...invalidOrDuplicate,
    ...consolidatedDuplicate
  ]);

  console.log(`Total deletion targets: ${namesToDelete.size}`);

  const tempClosedSchedule: Record<string, string> = {
    Monday: "Temporarily Closed",
    Tuesday: "Temporarily Closed",
    Wednesday: "Temporarily Closed",
    Thursday: "Temporarily Closed",
    Friday: "Temporarily Closed",
    Saturday: "Temporarily Closed",
    Sunday: "Temporarily Closed"
  };

  const tbdSchedule: Record<string, string> = {
    Monday: "Hours TBD",
    Tuesday: "Hours TBD",
    Wednesday: "Hours TBD",
    Thursday: "Hours TBD",
    Friday: "Hours TBD",
    Saturday: "Hours TBD",
    Sunday: "Hours TBD"
  };

  // Specific custom overrides for edge cases, relocations, and active multi-unit locations
  const customOverrides: Record<string, Partial<Restaurant>> = {
    // 1. Unified Angie's: The New Fast Food (nearest location: 3805 E Broadway Blvd, 1.7 mi)
    "angie's prime grill": {
      name: "Angie's: The New Fast Food",
      cuisine: "Fast Food & Sandwiches",
      neighborhood: "Central & Midtown",
      distance: 1.7,
      price: "$$",
      notes: "Unified concept combining all Angie's menus (Maine lobster rolls, USDA Prime steak bowls, fried chicken, burgers, breakfast, and sides) under 'The New Fast Food' format; closest location at 3805 E Broadway Blvd (Broadway & Alvernon).",
      hours: {
        Monday: "6:30 AM - 9:00 PM",
        Tuesday: "6:30 AM - 9:00 PM",
        Wednesday: "6:30 AM - 9:00 PM",
        Thursday: "6:30 AM - 9:00 PM",
        Friday: "6:30 AM - 9:00 PM",
        Saturday: "6:30 AM - 9:00 PM",
        Sunday: "6:30 AM - 9:00 PM"
      }
    },

    // 2. Blake's Lotaburger: Speedway closed; active location at 3560 N Craycroft Rd
    "blake's lotaburger": {
      distance: 3.5,
      neighborhood: "Northeast & Foothills",
      notes: "New Mexico-born chain famous for green chile cheeseburgers; closest active location at 3560 N Craycroft Rd (Speedway location closed October 2026).",
      hours: {
        Monday: "7:00 AM - 10:00 PM",
        Tuesday: "7:00 AM - 10:00 PM",
        Wednesday: "7:00 AM - 10:00 PM",
        Thursday: "7:00 AM - 10:00 PM",
        Friday: "7:00 AM - 10:00 PM",
        Saturday: "7:00 AM - 10:00 PM",
        Sunday: "7:00 AM - 9:00 PM"
      }
    },

    // 3. Magpies Gourmet Pizza: 4th Ave closed; closest active branch is 6342 N Oracle Rd
    "magpies gourmet pizza": {
      neighborhood: "Northside & Foothills",
      distance: 5.6,
      notes: "Iconic Tucson gourmet pizzeria known for creative specialty pies and scratch dough. Historical 4th Ave location closed; active locations at 6342 N Oracle Rd and 105 S Houghton Rd.",
      hours: {
        Monday: "11:00 AM - 9:00 PM",
        Tuesday: "11:00 AM - 9:00 PM",
        Wednesday: "11:00 AM - 9:00 PM",
        Thursday: "11:00 AM - 9:00 PM",
        Friday: "11:00 AM - 10:00 PM",
        Saturday: "11:00 AM - 10:00 PM",
        Sunday: "11:00 AM - 9:00 PM"
      }
    },

    // 4. Yellow Brick Coffee: Benedictine Monastery flagship cafe is open daily
    "ybc by yellow brick": {
      name: "Yellow Brick Coffee",
      neighborhood: "Central & Midtown",
      distance: 0.9,
      notes: "Specialty single-origin coffee roaster and cafe with fresh food menu inside the historic Benedictine Monastery at 800 N Country Club Rd.",
      hours: {
        Monday: "7:00 AM - 2:00 PM",
        Tuesday: "7:00 AM - 2:00 PM",
        Wednesday: "7:00 AM - 2:00 PM",
        Thursday: "7:00 AM - 2:00 PM",
        Friday: "7:00 AM - 2:00 PM",
        Saturday: "7:00 AM - 2:00 PM",
        Sunday: "7:00 AM - 2:00 PM"
      }
    },

    // 5. De Novo Market and Tap: Active downtown market and taproom at 177 N Church Ave
    "de novo market": {
      name: "De Novo Market and Tap",
      neighborhood: "Urban Core",
      distance: 5.2,
      notes: "Downtown market, taproom, and cafe at 177 N Church Ave offering specialty coffee, breakfast sandwiches, local pantry goods, and draft beers.",
      hours: {
        Monday: "7:00 AM - 3:00 PM",
        Tuesday: "7:00 AM - 3:00 PM",
        Wednesday: "7:00 AM - 8:00 PM",
        Thursday: "7:00 AM - 8:00 PM",
        Friday: "7:00 AM - 9:00 PM",
        Saturday: "8:00 AM - 9:00 PM",
        Sunday: "8:00 AM - 3:00 PM"
      }
    },

    // 6. Raspaderia El Sahuaro: Active downtown raspados shop at 245 E Congress St
    "raspaderia el sahuaro": {
      neighborhood: "Urban Core",
      distance: 5.4,
      notes: "Downtown Mexican snack bar and raspados shop in the former HUB Ice Cream space by the team behind La Yaquesita.",
      hours: {
        Monday: "12:00 PM - 9:00 PM",
        Tuesday: "12:00 PM - 9:00 PM",
        Wednesday: "12:00 PM - 9:00 PM",
        Thursday: "12:00 PM - 9:00 PM",
        Friday: "12:00 PM - 10:00 PM",
        Saturday: "12:00 PM - 10:00 PM",
        Sunday: "12:00 PM - 9:00 PM"
      }
    },

    // 7. Hidden Hearth: Active artisan micro-bakery at MSA Annex
    "hidden hearth": {
      neighborhood: "Urban Core",
      distance: 5.5,
      notes: "Artisan micro-bakery at the MSA Annex (267 S Avenida del Convento) featuring naturally leavened breads, seasonal pastries, and cookies.",
      hours: {
        Monday: "Closed",
        Tuesday: "Closed",
        Wednesday: "8:00 AM - 2:00 PM",
        Thursday: "8:00 AM - 2:00 PM",
        Friday: "8:00 AM - 2:00 PM",
        Saturday: "8:00 AM - 2:00 PM",
        Sunday: "8:00 AM - 2:00 PM"
      }
    },

    // 8. Mt Lemmon Coffee and Tea: Active mountain cafe in Summerhaven
    "mt lemmon coffee and tea": {
      name: "Mt. Lemmon Coffee and Tea Co.",
      neighborhood: "Eastside & Vail",
      distance: 17.4,
      notes: "Cozy mountain cafe in Summerhaven on Mt. Lemmon serving espresso, specialty loose-leaf teas, and pastries.",
      hours: {
        Monday: "8:00 AM - 5:00 PM",
        Tuesday: "8:00 AM - 5:00 PM",
        Wednesday: "8:00 AM - 5:00 PM",
        Thursday: "8:00 AM - 5:00 PM",
        Friday: "8:00 AM - 5:00 PM",
        Saturday: "8:00 AM - 6:00 PM",
        Sunday: "8:00 AM - 6:00 PM"
      }
    },

    // 9. Oasis Nutrition: Active smoothie & tea bar in Oro Valley
    "oasis nutrition": {
      neighborhood: "Northside & Foothills",
      distance: 10.0,
      notes: "Healthy smoothie and energy tea bar in Oro Valley offering loaded herbal teas, protein shakes, and wellness snacks.",
      hours: {
        Monday: "7:00 AM - 5:00 PM",
        Tuesday: "7:00 AM - 5:00 PM",
        Wednesday: "7:00 AM - 5:00 PM",
        Thursday: "7:00 AM - 5:00 PM",
        Friday: "7:00 AM - 5:00 PM",
        Saturday: "8:00 AM - 3:00 PM",
        Sunday: "Closed"
      }
    },

    // 10. KFC: Broadway closed; closest active location at 2990 E 22nd St
    "kfc (broadway)": {
      name: "KFC",
      neighborhood: "Central & Midtown",
      distance: 2.4,
      notes: "Classic fast-food chain famous for Original Recipe fried chicken, buckets, and sides. Closest location at 2990 E 22nd St.",
      hours: {
        Monday: "10:00 AM - 10:00 PM",
        Tuesday: "10:00 AM - 10:00 PM",
        Wednesday: "10:00 AM - 10:00 PM",
        Thursday: "10:00 AM - 10:00 PM",
        Friday: "10:00 AM - 11:00 PM",
        Saturday: "10:00 AM - 11:00 PM",
        Sunday: "10:00 AM - 10:00 PM"
      }
    },

    // 11. Sushi Cortaro: River closed; main location active at 8225 N Courtney Page Way
    "sushi cortaro on river": {
      name: "Sushi Cortaro",
      neighborhood: "Northwest & Marana",
      distance: 12.5,
      notes: "Contemporary Japanese cuisine and sushi rolls. River Rd location closed; main location active at 8225 N Courtney Page Way.",
      hours: {
        Monday: "11:00 AM - 9:00 PM",
        Tuesday: "Closed",
        Wednesday: "11:00 AM - 9:00 PM",
        Thursday: "11:00 AM - 9:00 PM",
        Friday: "11:00 AM - 9:00 PM",
        Saturday: "11:00 AM - 9:00 PM",
        Sunday: "12:00 PM - 9:00 PM"
      }
    },

    // 12. Harvest: River closed; active flagship in Oro Valley at 10355 N La Cañada Dr
    "harvest": {
      name: "Harvest Restaurant",
      neighborhood: "Northwest & Marana",
      distance: 11.8,
      notes: "Local scratch-made, farm-to-table cuisine with patio views of Pusch Ridge. River Rd location closed; active in Oro Valley at 10355 N La Cañada Dr.",
      hours: {
        Monday: "11:00 AM - 9:00 PM",
        Tuesday: "11:00 AM - 9:00 PM",
        Wednesday: "11:00 AM - 9:00 PM",
        Thursday: "11:00 AM - 9:00 PM",
        Friday: "11:00 AM - 9:00 PM",
        Saturday: "11:00 AM - 9:00 PM",
        Sunday: "10:00 AM - 8:00 PM"
      }
    },

    // 13. Aspasia Middle Eastern Restaurant: Confirmed open at 2310 N Country Club Rd
    "aspasia middle eastern restaurant": {
      hours: {
        Monday: "11:00 AM - 9:00 PM",
        Tuesday: "11:00 AM - 9:00 PM",
        Wednesday: "11:00 AM - 9:00 PM",
        Thursday: "11:00 AM - 9:00 PM",
        Friday: "1:30 PM - 9:00 PM",
        Saturday: "11:00 AM - 9:00 PM",
        Sunday: "11:00 AM - 9:00 PM"
      }
    },

    // 14. Tooley's Cafe: Confirmed open at 299 S Park Ave
    "tooley's cafe": {
      hours: {
        Monday: "Closed",
        Tuesday: "Closed",
        Wednesday: "8:30 AM - 2:30 PM",
        Thursday: "8:30 AM - 2:30 PM",
        Friday: "8:30 AM - 2:30 PM",
        Saturday: "8:30 AM - 2:30 PM",
        Sunday: "8:30 AM - 2:30 PM"
      }
    },

    // 15. Bailey's Artisan Pizza: Mobile trailer schedule
    "bailey's artisan pizza": {
      notes: "Mobile artisan wood-fired pizza trailer with house-prepped dough and fresh toppings; rotates north side, local bottle shops, and events.",
      hours: {
        Monday: "4:00 PM - 8:00 PM",
        Tuesday: "4:00 PM - 8:00 PM",
        Wednesday: "4:00 PM - 8:00 PM",
        Thursday: "4:00 PM - 8:00 PM",
        Friday: "4:00 PM - 8:00 PM",
        Saturday: "4:00 PM - 8:00 PM",
        Sunday: "4:00 PM - 8:00 PM"
      }
    },

    // 16. The Lounge: Hotel Congress grand lobby bar
    "the lounge": {
      hours: {
        Monday: "Closed",
        Tuesday: "Closed",
        Wednesday: "Closed",
        Thursday: "4:00 PM - 10:00 PM",
        Friday: "4:00 PM - 10:00 PM",
        Saturday: "4:00 PM - 10:00 PM",
        Sunday: "Closed"
      }
    },

    // 17. Tap & Bottle: 403 N 6th Ave
    "tap & bottle": {
      hours: {
        Monday: "3:00 PM - 9:00 PM",
        Tuesday: "12:00 PM - 10:00 PM",
        Wednesday: "12:00 PM - 10:00 PM",
        Thursday: "12:00 PM - 11:00 PM",
        Friday: "12:00 PM - 11:00 PM",
        Saturday: "12:00 PM - 11:00 PM",
        Sunday: "12:00 PM - 9:00 PM"
      }
    },

    // 18. JoJo's Cafe & Bakery: Old Town Artisans Courtyard
    "jojo's cafe & bakery": {
      hours: {
        Monday: "Closed",
        Tuesday: "9:00 AM - 9:00 PM",
        Wednesday: "9:00 AM - 9:00 PM",
        Thursday: "9:00 AM - 9:00 PM",
        Friday: "9:00 AM - 9:00 PM",
        Saturday: "9:00 AM - 9:00 PM",
        Sunday: "Closed"
      }
    },

    // 19. snack.: The Boxyard
    "snack.": {
      hours: {
        Monday: "11:00 AM - 12:00 AM",
        Tuesday: "11:00 AM - 12:00 AM",
        Wednesday: "11:00 AM - 12:00 AM",
        Thursday: "11:00 AM - 2:00 AM",
        Friday: "11:00 AM - 2:00 AM",
        Saturday: "11:00 AM - 2:00 AM",
        Sunday: "11:00 AM - 12:00 AM"
      }
    },

    // 20. Club Congress: Hotel Congress nightclub
    "club congress": {
      hours: {
        Monday: "7:00 PM - 2:00 AM",
        Tuesday: "7:00 PM - 2:00 AM",
        Wednesday: "7:00 PM - 2:00 AM",
        Thursday: "7:00 PM - 2:00 AM",
        Friday: "7:00 PM - 2:00 AM",
        Saturday: "7:00 PM - 2:00 AM",
        Sunday: "7:00 PM - 2:00 AM"
      }
    },

    // 21. Sbarro: Park Place Mall
    "sbarro": {
      hours: {
        Monday: "10:00 AM - 8:00 PM",
        Tuesday: "10:00 AM - 8:00 PM",
        Wednesday: "10:00 AM - 8:00 PM",
        Thursday: "10:00 AM - 8:00 PM",
        Friday: "10:00 AM - 9:00 PM",
        Saturday: "10:00 AM - 9:00 PM",
        Sunday: "11:00 AM - 6:00 PM"
      }
    },

    // 22. 313 Detroit Pizza: Virtual concept operating out of Renee's kitchen
    "313 detroit pizza": {
      notes: "Authentic Detroit-style square pan pizza with crispy cheese frico edges and Motor City coney dogs operating out of Renee's kitchen.",
      hours: {
        Monday: "3:00 PM - 8:00 PM",
        Tuesday: "3:00 PM - 8:00 PM",
        Wednesday: "11:00 AM - 8:00 PM",
        Thursday: "11:00 AM - 8:00 PM",
        Friday: "11:00 AM - 8:00 PM",
        Saturday: "11:00 AM - 8:00 PM",
        Sunday: "11:00 AM - 8:00 PM"
      }
    },

    // 23. Bill's Grill: Loews Ventana Canyon Resort
    "bill's grill": {
      hours: {
        Monday: "11:00 AM - 6:00 PM",
        Tuesday: "11:00 AM - 6:00 PM",
        Wednesday: "11:00 AM - 6:00 PM",
        Thursday: "11:00 AM - 6:00 PM",
        Friday: "11:00 AM - 6:00 PM",
        Saturday: "11:00 AM - 6:00 PM",
        Sunday: "11:00 AM - 6:00 PM"
      }
    },

    // 24. Frida American Brasserie: La Encantada
    "frida american brasserie": {
      hours: {
        Monday: "10:00 AM - 10:00 PM",
        Tuesday: "10:00 AM - 10:00 PM",
        Wednesday: "10:00 AM - 10:00 PM",
        Thursday: "10:00 AM - 11:00 PM",
        Friday: "10:00 AM - 11:00 PM",
        Saturday: "10:00 AM - 11:00 PM",
        Sunday: "10:00 AM - 11:00 PM"
      }
    },

    // 25. BarDown Fitness: LA Fitness Marana & mobile trailer
    "bardown fitness": {
      notes: "Nutritional shakes, acai bowls, clean protein smoothies, and natural energy drinks located inside LA Fitness in Marana and mobile trailer.",
      hours: {
        Monday: "8:00 AM - 7:00 PM",
        Tuesday: "8:00 AM - 7:00 PM",
        Wednesday: "8:00 AM - 7:00 PM",
        Thursday: "8:00 AM - 7:00 PM",
        Friday: "8:00 AM - 7:00 PM",
        Saturday: "8:00 AM - 2:00 PM",
        Sunday: "Closed"
      }
    },

    // 26. Tohono Chul Bistro: Daily 9 AM - 4 PM
    "tohono chul bistro": {
      hours: {
        Monday: "9:00 AM - 4:00 PM",
        Tuesday: "9:00 AM - 4:00 PM",
        Wednesday: "9:00 AM - 4:00 PM",
        Thursday: "9:00 AM - 4:00 PM",
        Friday: "9:00 AM - 4:00 PM",
        Saturday: "9:00 AM - 4:00 PM",
        Sunday: "9:00 AM - 4:00 PM"
      }
    },

    // 27. Putter's Grill: Quarry Pines Golf Club
    "putter's grill": {
      hours: {
        Monday: "7:00 AM - 6:00 PM",
        Tuesday: "7:00 AM - 6:00 PM",
        Wednesday: "7:00 AM - 6:00 PM",
        Thursday: "7:00 AM - 6:00 PM",
        Friday: "7:00 AM - 6:00 PM",
        Saturday: "7:00 AM - 6:00 PM",
        Sunday: "7:00 AM - 6:00 PM"
      }
    },

    // 28. SweetScape Desserts: Casino Del Sol
    "sweetscape desserts": {
      hours: {
        Monday: "7:00 AM - 11:00 PM",
        Tuesday: "7:00 AM - 11:00 PM",
        Wednesday: "7:00 AM - 11:00 PM",
        Thursday: "7:00 AM - 11:00 PM",
        Friday: "7:00 AM - 11:00 PM",
        Saturday: "7:00 AM - 11:00 PM",
        Sunday: "7:00 AM - 11:00 PM"
      }
    },

    // 29. Tanque Verde Ranch: Resort dining
    "tanque verde ranch": {
      hours: {
        Monday: "7:30 AM - 8:30 PM",
        Tuesday: "7:30 AM - 8:30 PM",
        Wednesday: "7:30 AM - 8:30 PM",
        Thursday: "7:30 AM - 8:30 PM",
        Friday: "7:30 AM - 8:30 PM",
        Saturday: "7:30 AM - 8:30 PM",
        Sunday: "7:30 AM - 8:30 PM"
      }
    },

    // 30. American Legion: Post 36 (5845 E 22nd St)
    "american legion": {
      hours: {
        Monday: "8:00 AM - 10:00 PM",
        Tuesday: "8:00 AM - 10:00 PM",
        Wednesday: "8:00 AM - 10:00 PM",
        Thursday: "8:00 AM - 10:00 PM",
        Friday: "8:00 AM - 10:00 PM",
        Saturday: "8:00 AM - 10:00 PM",
        Sunday: "8:00 AM - 10:00 PM"
      }
    },

    // 31. El Bebos: 4012 W Valencia Rd
    "el bebos": {
      hours: {
        Monday: "4:00 PM - 11:00 PM",
        Tuesday: "4:00 PM - 11:00 PM",
        Wednesday: "4:00 PM - 11:00 PM",
        Thursday: "4:00 PM - 11:00 PM",
        Friday: "4:00 PM - 11:00 PM",
        Saturday: "4:00 PM - 11:00 PM",
        Sunday: "4:00 PM - 11:00 PM"
      }
    },

    // 32. Special Eats: Replace with Food Truck
    "special eats sweets": {
      name: "Special Eats Food Truck",
      cuisine: "Fast Food & Sandwiches",
      neighborhood: "Central & Midtown",
      distance: 1.8,
      price: "$",
      notes: "Nonprofit mobile food truck and sweets trailer specializing in gourmet grilled cheese sandwiches, melts, and treats, providing meaningful employment for adults with special needs.",
      isLocal: true,
      enriched: true,
      hours: {
        Monday: "11:00 AM - 2:00 PM",
        Tuesday: "11:00 AM - 2:00 PM",
        Wednesday: "11:00 AM - 2:00 PM",
        Thursday: "11:00 AM - 2:00 PM",
        Friday: "11:00 AM - 2:00 PM",
        Saturday: "11:00 AM - 3:00 PM",
        Sunday: "Closed"
      }
    },

    // 33. Ramiro's Taco Shop: Update location to 1350 E Broadway Blvd (1.9 mi, Central & Midtown)
    "ramiro's": {
      name: "Ramiro's Taco Shop",
      cuisine: "Mexican & Sonoran",
      neighborhood: "Central & Midtown",
      distance: 1.9,
      price: "$",
      notes: "Popular late-night Sonoran taqueria serving loaded breakfast burritos, carne asada fries, rolled tacos, and salsa bar; located at 1350 E Broadway Blvd.",
      hours: {
        Monday: "6:00 AM - 12:00 AM",
        Tuesday: "6:00 AM - 12:00 AM",
        Wednesday: "6:00 AM - 12:00 AM",
        Thursday: "6:00 AM - 2:00 AM",
        Friday: "6:00 AM - 3:00 AM",
        Saturday: "6:00 AM - 3:00 AM",
        Sunday: "6:00 AM - 1:00 AM"
      }
    }
  };

  const updatedDb: Restaurant[] = [];
  let deletedCount = 0;
  let hoursUpdatedCount = 0;
  let tempClosedCount = 0;
  let comingSoonCount = 0;
  let customOverrideCount = 0;

  for (const item of existingDb) {
    const key = item.name.toLowerCase().trim();

    // 1. Check if item should be removed
    if (namesToDelete.has(key)) {
      deletedCount++;
      console.log(` - Removed: ${item.name} (${item.neighborhood}, ${item.distance} mi)`);
      continue;
    }

    const updatedItem: Restaurant = { ...item };

    // 2. Apply custom overrides if defined
    if (customOverrides[key]) {
      Object.assign(updatedItem, customOverrides[key]);
      customOverrideCount++;
    } else {
      // 3. Otherwise check audit change
      const auditChange = changesMap.get(key);
      if (auditChange) {
        if (auditChange.action === 'temporarily_closed') {
          updatedItem.hours = { ...tempClosedSchedule };
          tempClosedCount++;
        } else if (auditChange.action === 'not_yet_open') {
          updatedItem.comingSoon = true;
          updatedItem.hours = { ...tbdSchedule };
          comingSoonCount++;
        } else if (auditChange.action === 'update_hours' && auditChange.corrected_hours) {
          updatedItem.hours = { ...auditChange.corrected_hours };
          hoursUpdatedCount++;
        }
      }
    }

    updatedDb.push(updatedItem);
  }

  console.log('--- Summary of Actions ---');
  console.log(`Removed: ${deletedCount} entries`);
  console.log(`Custom overrides: ${customOverrideCount} entries`);
  console.log(`Standard hours updated: ${hoursUpdatedCount} entries`);
  console.log(`Temporarily closed updated: ${tempClosedCount} entries`);
  console.log(`Coming soon updated: ${comingSoonCount} entries`);
  console.log(`Total active restaurants in database: ${updatedDb.length}`);

  // Sort by distance ascending, then by name ascending
  updatedDb.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return a.name.localeCompare(b.name);
  });

  // Save to src/database_pretty.json
  fs.writeFileSync(PRETTY_PATH, JSON.stringify(updatedDb, null, 2) + '\n', 'utf8');
  console.log(`Saved updated database to ${PRETTY_PATH}`);

  // Save to src/data.ts
  const dataTsContent = `import { Restaurant } from './types';

export const restaurants: Restaurant[] = JSON.parse(
  ${JSON.stringify(JSON.stringify(updatedDb))}
);
`;
  fs.writeFileSync(DATA_TS_PATH, dataTsContent, 'utf8');
  console.log(`Saved synchronized data to ${DATA_TS_PATH}`);
}

main();
