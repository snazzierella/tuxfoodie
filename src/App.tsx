import { useState, useEffect, useMemo, FC } from 'react';
import Confetti from 'react-confetti';
import { restaurants } from './data';
import { Restaurant } from './types';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Check, 
  Utensils, 
  Dices, 
  Filter, 
  Trophy,
  X,
  Heart,
  EyeOff,
  Eye,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  Sunrise,
  Moon,
  Sun,
  Pizza,
  Coffee,
  Beer,
  Sandwich,
  IceCream,
  Soup,
  Salad,
  Fish,
  Building2,
  Building,
  Sunset,
  Mountain,
  MountainSnow,
  Wheat,
  Flame,
  Globe,
  CupSoda,
  Drumstick,
  Egg,
  Award,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const ACHIEVEMENTS = [
  { id: 'first-bite', threshold: 1, title: 'First Bite', icon: '🥄', description: "You've started your journey!" },
  { id: 'foodie-training', threshold: 10, title: 'Foodie in Training', icon: '🥨', description: "Getting a taste of the town!" },
  { id: 'local-explorer', threshold: 25, title: 'Local Explorer', icon: '🌮', description: "You're becoming a regular!" },
  { id: 'tucson-taster', threshold: 50, title: 'Tucson Taster', icon: '🌵', description: "Halfway through the list!" },
  { id: 'flavor-master', threshold: 75, title: 'Flavor Master', icon: '🌶️', description: "You're on fire!" },
  { id: 'tuxfoodie-legend', threshold: 100, title: 'TuxFoodie Legend', icon: '👑', description: "You've conquered the culinary scene!" },
];

// --- Helpers ---
const getRestaurantId = (r: Restaurant) => `${r.name}-${r.neighborhood}`;
const getGoogleSearchUrl = (r: Restaurant) => `https://www.google.com/search?q=${encodeURIComponent(`${r.name} restaurant Tucson ${r.neighborhood}`)}`;
const getPriceValue = (price: string) => price.length;

const getCuisineIcon = (cuisine: string) => {
  if (cuisine.includes('Dessert') || cuisine.includes('Bakery')) return <IceCream className="w-3.5 h-3.5" />;
  if (cuisine.includes('Asian') || cuisine.includes('Sushi')) return <Soup className="w-3.5 h-3.5" />;
  if (cuisine.includes('Pizza') || cuisine.includes('Italian')) return <Pizza className="w-3.5 h-3.5" />;
  if (cuisine.includes('Coffee') || cuisine.includes('Cafe')) return <Coffee className="w-3.5 h-3.5" />;
  if (cuisine.includes('Bar') || cuisine.includes('Pub') || cuisine.includes('Brewery')) return <Beer className="w-3.5 h-3.5" />;
  if (cuisine.includes('Sandwich') || cuisine.includes('Fast Food')) return <Sandwich className="w-3.5 h-3.5" />;
  if (cuisine.includes('Steakhouse') || cuisine.includes('BBQ')) return <Drumstick className="w-3.5 h-3.5" />;
  if (cuisine.includes('Healthy') || cuisine.includes('Vegan')) return <Salad className="w-3.5 h-3.5" />;
  if (cuisine.includes('Seafood')) return <Fish className="w-3.5 h-3.5" />;
  if (cuisine.includes('Breakfast') || cuisine.includes('Diner')) return <Sunrise className="w-3.5 h-3.5" />;
  if (cuisine.includes('Mexican') || cuisine.includes('Sonoran')) return <Flame className="w-3.5 h-3.5" />;
  if (cuisine.includes('Mediterranean') || cuisine.includes('Global')) return <Globe className="w-3.5 h-3.5" />;
  if (cuisine.includes('Boba') || cuisine.includes('Beverages')) return <CupSoda className="w-3.5 h-3.5" />;
  return <Utensils className="w-3.5 h-3.5" />;
};

const getNeighborhoodIcon = (neighborhood: string) => {
  if (neighborhood.includes('Central') || neighborhood.includes('Midtown')) return <Building2 className="w-3.5 h-3.5" />;
  if (neighborhood.includes('Urban Core')) return <Building className="w-3.5 h-3.5" />;
  if (neighborhood.includes('Southside') || neighborhood.includes('Heritage')) return <Sunset className="w-3.5 h-3.5" />;
  if (neighborhood.includes('Eastside') || neighborhood.includes('Vail')) return <Mountain className="w-3.5 h-3.5" />;
  if (neighborhood.includes('Northside') || neighborhood.includes('Foothills')) return <MountainSnow className="w-3.5 h-3.5" />;
  if (neighborhood.includes('Northwest') || neighborhood.includes('Marana')) return <Wheat className="w-3.5 h-3.5" />;
  return <MapPin className="w-3.5 h-3.5" />;
};

const getPriceColor = (price: string, isDarkMode: boolean) => {
  const len = price.length;
  if (len === 1) return isDarkMode ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (len === 2) return isDarkMode ? 'bg-blue-900/50 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100';
  if (len === 3) return isDarkMode ? 'bg-purple-900/50 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-600 border-purple-100';
  return isDarkMode ? 'bg-rose-900/50 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-600 border-rose-100';
};

const getNormalizedName = (name: string) => {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
};

// --- Components ---

interface RestaurantCardProps {
  restaurant: Restaurant;
  isVisited: boolean;
  isFavorite: boolean;
  isNotInterested: boolean;
  isDarkMode: boolean;
  onToggleVisited: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleNotInterested: (id: string) => void;
}

const RestaurantCard: FC<RestaurantCardProps> = ({ 
  restaurant, 
  isVisited, 
  isFavorite,
  isNotInterested,
  isDarkMode,
  onToggleVisited,
  onToggleFavorite,
  onToggleNotInterested
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative p-5 rounded-3xl border-2 transition-all duration-300
        ${isVisited 
          ? isDarkMode ? 'bg-teal-900/40 border-teal-800 shadow-sm' : 'bg-teal-50/80 border-teal-200 shadow-sm' 
          : isNotInterested
            ? isDarkMode ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-100 opacity-60'
            : isDarkMode 
              ? 'bg-slate-800/80 border-slate-700 shadow-sm shadow-slate-900 hover:shadow-md hover:shadow-slate-800 hover:-translate-y-1'
              : 'bg-white border-rose-100 shadow-sm shadow-rose-100 hover:shadow-md hover:shadow-rose-200 hover:-translate-y-1'
        }
      `}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-3">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className={`font-display text-xl font-bold leading-tight ${
              isVisited 
                ? isDarkMode ? 'text-teal-400' : 'text-teal-700' 
                : isNotInterested
                  ? 'text-slate-500 line-through'
                  : isDarkMode ? 'text-slate-100' : 'text-slate-700'
            }`}>
              {restaurant.name}
            </h3>
            {isVisited && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                isDarkMode ? 'bg-teal-900/60 text-teal-300 border-teal-700' : 'bg-teal-100 text-teal-600 border-teal-200'
              }`}>
                Visited
              </span>
            )}
            {isNotInterested && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                Hidden
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
              isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {restaurant.isLocal !== false ? <Store className="w-3 h-3" /> : <Building className="w-3 h-3" />}
              {restaurant.isLocal !== false ? 'Local' : 'National'}
            </span>
          </div>
          
          <div className={`flex flex-wrap gap-y-2 gap-x-2 text-sm text-slate-500 mb-3 ${isNotInterested ? 'opacity-50' : ''}`}>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isDarkMode ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}>
              {getCuisineIcon(restaurant.cuisine)}
              {restaurant.cuisine}
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isDarkMode ? 'bg-orange-900/40 text-orange-300 border-orange-800' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {getNeighborhoodIcon(restaurant.neighborhood)}
              {restaurant.neighborhood}
            </span>
          </div>

          <div className={`flex items-center gap-2 text-xs font-bold text-slate-400 ${isNotInterested ? 'opacity-50' : ''}`}>
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${
              isDarkMode ? 'text-slate-400 bg-slate-700' : 'text-slate-500 bg-slate-100'
            }`}>
              {restaurant.distance} mi
            </span>
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full border ${getPriceColor(restaurant.price || '', isDarkMode)}`}>
              {restaurant.price || 'N/A'}
            </span>
          </div>
          
          {restaurant.notes && (
            <div className={`mt-4 relative ${isNotInterested ? 'opacity-50' : ''}`}>
              <div className={`absolute -left-2 top-0 bottom-0 w-1 rounded-full ${isDarkMode ? 'bg-rose-700' : 'bg-rose-200'}`}></div>
              <p className={`pl-3 text-sm italic leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                "{restaurant.notes}"
              </p>
            </div>
          )}
          
          <a 
            href={getGoogleSearchUrl(restaurant)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 mt-4 text-xs font-bold transition-colors px-3 py-1.5 rounded-full ${
              isDarkMode 
                ? 'text-rose-300 hover:text-rose-200 bg-rose-900/30 hover:bg-rose-900/50' 
                : 'text-rose-400 hover:text-rose-500 bg-rose-50 hover:bg-rose-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Search className="w-3.5 h-3.5" />
            Find Info
          </a>
        </div>

        <div className={`flex flex-row sm:flex-col gap-3 justify-end sm:justify-start w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={() => onToggleVisited(getRestaurantId(restaurant))}
            className={`
              flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border-2
              ${isVisited 
                ? 'bg-teal-400 border-teal-400 text-white shadow-lg shadow-teal-200 scale-110' 
                : isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-teal-700 hover:text-teal-400'
                  : 'bg-white border-slate-100 text-slate-300 hover:border-teal-200 hover:text-teal-300'
              }
            `}
            title={isVisited ? "Mark as not visited" : "Mark as visited"}
          >
            <Check className="w-6 h-6 stroke-[3]" />
          </button>
          <button
            onClick={() => onToggleFavorite(getRestaurantId(restaurant))}
            className={`
              flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border-2
              ${isFavorite 
                ? 'bg-rose-400 border-rose-400 text-white shadow-lg shadow-rose-200 scale-110' 
                : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-rose-700 hover:text-rose-400'
                  : 'bg-white border-slate-100 text-slate-300 hover:border-rose-200 hover:text-rose-300'
              }
            `}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-5 h-5 stroke-[3] ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onToggleNotInterested(getRestaurantId(restaurant))}
            className={`
              flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border-2
              ${isNotInterested
                ? isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600' 
                  : 'bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300'
                : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                  : 'bg-white border-slate-100 text-slate-300 hover:border-slate-300 hover:text-slate-400'
              }
            `}
            title={isNotInterested ? "Show in list" : "Not interested"}
          >
            {isNotInterested ? <Eye className="w-5 h-5 stroke-[2]" /> : <EyeOff className="w-5 h-5 stroke-[2]" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const RandomPickModal = ({ 
  isOpen, 
  onClose, 
  restaurant,
  onToggleVisited,
  onToggleFavorite,
  isVisited,
  isFavorite
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  restaurant: Restaurant | null;
  onToggleVisited: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isVisited: boolean;
  isFavorite: boolean;
}) => {
  if (!isOpen || !restaurant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white ring-4 ring-rose-100"
      >
        <div className="bg-rose-400 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_2px,transparent_2px)] bg-[size:20px_20px]"></div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/20 rounded-full p-1 hover:bg-white/30 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-1">It's a Sign!</h2>
            <p className="text-rose-100 font-medium">Your destiny awaits at...</p>
          </div>
        </div>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-display font-bold text-slate-800 mb-2 leading-tight">{restaurant.name}</h3>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
              <span className="bg-slate-100 px-3 py-1 rounded-full">{restaurant.cuisine}</span>
              <span className="bg-slate-100 px-3 py-1 rounded-full">{restaurant.neighborhood}</span>
              <span className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                {restaurant.isLocal !== false ? <Store className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                {restaurant.isLocal !== false ? 'Local' : 'National'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100">
              <span className="block text-xs text-rose-400 font-bold uppercase tracking-wider mb-1">Distance</span>
              <span className="font-display text-xl font-bold text-rose-600">{restaurant.distance} mi</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
              <span className="block text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Price</span>
              <span className="font-display text-xl font-bold text-blue-600">{restaurant.price || '-'}</span>
            </div>
          </div>

          <p className="text-sm text-slate-500 italic text-center mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            "{restaurant.notes}"
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={() => {
                onToggleFavorite(getRestaurantId(restaurant));
              }}
              className={`flex-1 py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border-2
                ${isFavorite 
                  ? 'bg-rose-100 text-rose-600 border-rose-200' 
                  : 'bg-white text-slate-400 border-slate-100 hover:border-rose-200 hover:text-rose-400'}
              `}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => {
                onToggleVisited(getRestaurantId(restaurant));
                onClose();
              }}
              className="flex-[3] py-3.5 rounded-2xl font-bold bg-teal-400 text-white shadow-lg shadow-teal-200 hover:bg-teal-500 hover:scale-[1.02] transition-all border-2 border-teal-400"
            >
              Let's Go!
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <a 
              href={getGoogleSearchUrl(restaurant)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors"
            >
              View Info & Hours on Google
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // State
  const [visited, setVisited] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('tuxfoodie-visited');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('tuxfoodie-favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [notInterested, setNotInterested] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('tuxfoodie-not-interested');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [search, setSearch] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [localFilter, setLocalFilter] = useState('All'); // All, Local, National
  const [visitedFilter, setVisitedFilter] = useState('All'); // All, Visited, Not Visited, Hidden
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('distance-asc'); // distance-asc, distance-desc, price-asc, price-desc
  const [maxDistance, setMaxDistance] = useState(30);
  const [showFilters, setShowFilters] = useState(false);
  const [randomPick, setRandomPick] = useState<Restaurant | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [batchVisitData, setBatchVisitData] = useState<{ name: string, displayName: string, currentId: string } | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('tuxfoodie-achievements');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showAchievementPopup, setShowAchievementPopup] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tuxfoodie-theme') === 'dark' || 
        (!localStorage.getItem('tuxfoodie-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const stats = useMemo(() => {
    const total = restaurants.length;
    const visitedCount = visited.size;
    const percentage = Math.round((visitedCount / total) * 100);
    return { total, visitedCount, percentage };
  }, [visited]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('tuxfoodie-visited', JSON.stringify([...visited]));
  }, [visited]);

  useEffect(() => {
    localStorage.setItem('tuxfoodie-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('tuxfoodie-not-interested', JSON.stringify([...notInterested]));
  }, [notInterested]);

  useEffect(() => {
    localStorage.setItem('tuxfoodie-achievements', JSON.stringify([...unlockedAchievements]));
  }, [unlockedAchievements]);

  useEffect(() => {
    localStorage.setItem('tuxfoodie-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Achievement Check
  useEffect(() => {
    const percentage = stats.percentage;
    // Check for new unlocks
    const newUnlocks: typeof ACHIEVEMENTS[0][] = [];
    
    ACHIEVEMENTS.forEach(achievement => {
      if (percentage >= achievement.threshold && !unlockedAchievements.has(achievement.id)) {
        newUnlocks.push(achievement);
      }
    });

    if (newUnlocks.length > 0) {
      setUnlockedAchievements(prev => {
        const next = new Set(prev);
        newUnlocks.forEach(a => next.add(a.id));
        return next;
      });
      // Show the highest threshold achievement unlocked
      setShowAchievementPopup(newUnlocks[newUnlocks.length - 1]);
    }
  }, [stats.percentage, unlockedAchievements]);

  // Derived Data
  const neighborhoods = useMemo(() => 
    ['All', ...new Set(restaurants.map(r => r.neighborhood))].sort(), 
  [restaurants]);

  const cuisines = useMemo(() => 
    ['All', ...new Set(restaurants.map(r => r.cuisine))].sort(), 
  [restaurants]);
  
  const prices = useMemo(() => 
    ['All', ...new Set(restaurants.map(r => r.price).filter(Boolean))].sort(), 
  [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const id = getRestaurantId(r);
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                          r.notes.toLowerCase().includes(search.toLowerCase());
      const matchesNeighborhood = selectedNeighborhood === 'All' || r.neighborhood === selectedNeighborhood;
      const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
      const matchesPrice = selectedPrice === 'All' || r.price === selectedPrice;
      const matchesDistance = r.distance <= maxDistance;
      
      const isHidden = notInterested.has(id);
      
      let matchesVisited = true;
      if (visitedFilter === 'Visited') matchesVisited = visited.has(id);
      else if (visitedFilter === 'Not Visited') matchesVisited = !visited.has(id);
      else if (visitedFilter === 'Hidden') matchesVisited = isHidden;
      else matchesVisited = !isHidden; // 'All' hides 'not interested' by default

      const matchesFavorites = favoritesOnly ? favorites.has(id) : true;
      
      let matchesLocal = true;
      if (localFilter === 'Local') matchesLocal = r.isLocal !== false; // Default to local if undefined
      else if (localFilter === 'National') matchesLocal = r.isLocal === false;

      return matchesSearch && matchesNeighborhood && matchesCuisine && matchesPrice && matchesDistance && matchesVisited && matchesFavorites && matchesLocal;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'distance-desc':
          return b.distance - a.distance;
        case 'price-asc':
          return getPriceValue(a.price) - getPriceValue(b.price);
        case 'price-desc':
          return getPriceValue(b.price) - getPriceValue(a.price);
        case 'distance-asc':
        default:
          return a.distance - b.distance;
      }
    });
  }, [search, selectedNeighborhood, selectedCuisine, selectedPrice, maxDistance, visitedFilter, favoritesOnly, sortBy, visited, favorites, notInterested, localFilter]);

  // Handlers
  const toggleVisited = (id: string) => {
    // Check if we are marking as visited (not unvisiting)
    if (!visited.has(id)) {
      // Find the restaurant name
      const restaurant = restaurants.find(r => getRestaurantId(r) === id);
      if (restaurant) {
        const normalizedName = getNormalizedName(restaurant.name);
        // Check if there are other locations with the same normalized name
        const otherLocations = restaurants.filter(r => 
          getNormalizedName(r.name) === normalizedName && getRestaurantId(r) !== id
        );
        
        if (otherLocations.length > 0) {
          // Check if any of them are unvisited
          const unvisitedLocations = otherLocations.filter(r => !visited.has(getRestaurantId(r)));
          if (unvisitedLocations.length > 0) {
            // Use the name of the restaurant without location info for display
            const displayName = restaurant.name.replace(/\s*\(.*?\)\s*/g, '').trim();
            setBatchVisitData({ name: normalizedName, displayName, currentId: id });
            return;
          }
        }
      }
    }

    setVisited(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBatchVisit = (markAll: boolean) => {
    if (!batchVisitData) return;
    
    setVisited(prev => {
      const next = new Set(prev);
      next.add(batchVisitData.currentId);
      
      if (markAll) {
        restaurants
          .filter(r => getNormalizedName(r.name) === batchVisitData.name)
          .forEach(r => next.add(getRestaurantId(r)));
      }
      
      return next;
    });
    setBatchVisitData(null);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNotInterested = (id: string) => {
    setNotInterested(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRandomPick = () => {
    const unvisited = restaurants.filter(r => !visited.has(getRestaurantId(r)) && !notInterested.has(getRestaurantId(r)));
    if (unvisited.length === 0) {
      alert("Wow! You've visited everywhere! Reset your progress to start over.");
      return;
    }
    const random = unvisited[Math.floor(Math.random() * unvisited.length)];
    setRandomPick(random);
  };

  const resetProgress = () => {
    setVisited(new Set());
    setFavorites(new Set());
    setNotInterested(new Set());
    setUnlockedAchievements(new Set());
    setShowResetConfirm(false);
  };

  return (
    <div className={`min-h-screen font-sans pb-32 selection:bg-rose-200 transition-colors duration-300 overflow-x-hidden ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-rose-50 text-slate-700'}`}>
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 55V15c0-2.2 1.8-4 4-4s4 1.8 4 4v40M30 35H18c-2.2 0-4-1.8-4-4v-6c0-2.2 1.8-4 4-4s4 1.8 4 4v6M38 30h12c2.2 0 4-1.8 4-4v-8c0-2.2-1.8-4-4-4s-4 1.8-4 4v8' fill='none' stroke='%2310b981' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      }}></div>

      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-lg border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-rose-50/90 border-rose-100'}`}>
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="w-full sm:w-auto">
              <h1 className={`font-display text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                TuxFoodie <span className="text-rose-400">Directory</span>
              </h1>
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1 ml-1">
                Culinary Quest • Tucson, AZ
              </p>
              <p className="text-[10px] text-slate-400 mt-2 ml-1 max-w-full sm:max-w-xs leading-tight">
                All distances calculated from Pima & Columbus intersection.<br />Use "Find Info" to see distance from you.
              </p>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-400 hover:text-yellow-500 shadow-sm shadow-rose-100'}`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-slate-700' : 'bg-white text-rose-300 hover:text-rose-500 shadow-sm shadow-rose-100'}`}
                  title="Reset Progress"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className={`text-right px-4 py-2 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-slate-900' : 'bg-white border-rose-50 shadow-rose-100'}`}>
                <div className="flex items-center justify-end gap-1.5 text-teal-500 font-black text-lg leading-none">
                  <Trophy className="w-5 h-5" />
                  <span>{stats.visitedCount} / {stats.total}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{stats.percentage}% Mastery</p>
              </div>
            </div>
          </div>

          {/* Achievements Badges */}
          <div className="flex justify-between mb-2 px-1">
            {ACHIEVEMENTS.map(achievement => {
              const isUnlocked = unlockedAchievements.has(achievement.id);
              return (
                <div 
                  key={achievement.id}
                  className={`relative group flex flex-col items-center transition-all duration-500 cursor-default ${isUnlocked ? 'opacity-100 scale-100' : 'opacity-30 scale-90 grayscale'}`}
                >
                  <div className={`text-xl mb-1 transition-transform ${isUnlocked ? 'group-hover:scale-125 group-hover:rotate-12' : ''}`}>
                    {achievement.icon}
                  </div>
                  {isUnlocked && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {achievement.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className={`h-3 w-full rounded-full overflow-hidden border p-0.5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-rose-100'}`}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.percentage}%` }}
              className="h-full bg-gradient-to-r from-teal-300 to-teal-400 rounded-full"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-5 py-8 relative z-10">
        
        {/* Search & Filter Toggle */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-rose-400' : 'text-rose-300 group-focus-within:text-rose-400'}`} />
            <input 
              type="text"
              placeholder="Search for cravings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-12 pr-6 py-4 border-2 rounded-full focus:outline-none focus:ring-4 transition-all font-medium ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-rose-500/50 focus:ring-rose-500/20 shadow-slate-900' 
                  : 'bg-white border-rose-100 text-slate-600 placeholder:text-rose-200 focus:border-rose-300 focus:ring-rose-100 shadow-rose-50'
              }`}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 rounded-full border-2 transition-all flex items-center gap-2 font-bold shadow-sm ${
              showFilters 
                ? isDarkMode ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-800 text-white border-slate-800 shadow-slate-200' 
                : isDarkMode 
                  ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-rose-500/50 hover:text-rose-400' 
                  : 'bg-white text-slate-500 border-rose-100 hover:border-rose-200 hover:text-rose-400 shadow-rose-50'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className={`p-6 rounded-[2rem] border-2 shadow-lg space-y-6 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-slate-900' : 'bg-white border-rose-100 shadow-rose-50/50'}`}>
                
                {/* Toggles Row */}
                <div className={`flex flex-wrap gap-6 pb-6 border-b-2 ${isDarkMode ? 'border-slate-700' : 'border-rose-50'}`}>
                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>Status</label>
                    <div className={`rounded-2xl p-1.5 ${isDarkMode ? 'bg-slate-900' : 'bg-rose-50'}`}>
                      {['All', 'Visited', 'Not Visited', 'Hidden'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setVisitedFilter(option)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            visitedFilter === option 
                              ? isDarkMode ? 'bg-slate-700 text-rose-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm shadow-rose-100' 
                              : isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-rose-300 hover:text-rose-400'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>Type</label>
                    <div className={`rounded-2xl p-1.5 ${isDarkMode ? 'bg-slate-900' : 'bg-rose-50'}`}>
                      {['All', 'Local', 'National'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setLocalFilter(option)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            localFilter === option 
                              ? isDarkMode ? 'bg-slate-700 text-rose-400 shadow-sm' : 'bg-white text-rose-500 shadow-sm shadow-rose-100' 
                              : isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-rose-300 hover:text-rose-400'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>Favorites</label>
                    <button
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                      className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border-2 transition-all h-[42px] ${
                        favoritesOnly
                          ? isDarkMode ? 'bg-rose-900/30 border-rose-800 text-rose-400' : 'bg-rose-100 border-rose-200 text-rose-500'
                          : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-500 hover:border-rose-800' : 'bg-white border-rose-100 text-slate-400 hover:border-rose-200'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
                      Favorites Only
                    </button>
                  </div>
                </div>

                {/* Sort & Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>Sort By</label>
                    <div className="relative">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`w-full p-3 pl-10 border-2 rounded-2xl text-sm font-bold focus:outline-none appearance-none cursor-pointer transition-colors ${
                          isDarkMode 
                            ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-rose-500/50 hover:bg-slate-800' 
                            : 'bg-rose-50 border-rose-100 text-slate-600 focus:border-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        <option value="distance-asc">Distance (Nearest First)</option>
                        <option value="distance-desc">Distance (Furthest First)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                      </select>
                      <ArrowUpDown className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-rose-400'}`} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2 px-1">
                      <span className={`font-bold uppercase text-xs tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>Max Distance</span>
                      <span className={`font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'text-rose-400 bg-rose-900/30' : 'text-rose-500 bg-rose-100'}`}>{maxDistance} mi</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={maxDistance} 
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className={`w-full h-3 rounded-full appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-rose-500' : 'bg-rose-100 accent-rose-400 hover:accent-rose-500'}`}
                    />
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Neighborhood', value: selectedNeighborhood, setter: setSelectedNeighborhood, options: neighborhoods },
                    { label: 'Cuisine', value: selectedCuisine, setter: setSelectedCuisine, options: cuisines },
                    { label: 'Price', value: selectedPrice, setter: setSelectedPrice, options: prices }
                  ].map((filter) => (
                    <div key={filter.label}>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>{filter.label}</label>
                      <select 
                        value={filter.value}
                        onChange={(e) => filter.setter(e.target.value)}
                        className={`w-full p-3 border-2 rounded-2xl text-sm font-medium focus:outline-none cursor-pointer transition-colors ${
                          isDarkMode 
                            ? 'bg-slate-900 border-slate-700 text-slate-300 focus:border-rose-500/50 hover:border-slate-600' 
                            : 'bg-white border-rose-100 text-slate-600 focus:border-rose-300 hover:border-rose-200'
                        }`}
                      >
                        {filter.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="space-y-5">
          {filteredRestaurants.length === 0 ? (
            <div className={`text-center py-16 ${isDarkMode ? 'text-slate-600' : 'text-rose-200'}`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${isDarkMode ? 'bg-slate-800 shadow-slate-900' : 'bg-white shadow-rose-100'}`}>
                <Utensils className="w-10 h-10 opacity-50" />
              </div>
              <p className={`font-display text-xl font-bold ${isDarkMode ? 'text-slate-500' : 'text-rose-300'}`}>No yummy spots found!</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters to find more treats.</p>
            </div>
          ) : (
            filteredRestaurants.map(r => (
              <RestaurantCard 
                key={getRestaurantId(r)} 
                restaurant={r} 
                isVisited={visited.has(getRestaurantId(r))}
                isFavorite={favorites.has(getRestaurantId(r))}
                isNotInterested={notInterested.has(getRestaurantId(r))}
                isDarkMode={isDarkMode}
                onToggleVisited={toggleVisited}
                onToggleFavorite={toggleFavorite}
                onToggleNotInterested={toggleNotInterested}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleRandomPick}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center z-40 border-4 ring-4 ${
          isDarkMode 
            ? 'bg-rose-500 text-white shadow-rose-900/50 border-slate-800 ring-slate-700' 
            : 'bg-rose-400 text-white shadow-rose-300 border-white ring-rose-100'
        }`}
      >
        <Dices className="w-8 h-8" />
      </motion.button>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border-4 p-8 text-center ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 ring-4 ring-slate-800' 
                  : 'bg-white border-white ring-4 ring-rose-100'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDarkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-500'
              }`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className={`text-2xl font-display font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Reset Progress?
              </h2>
              <p className={`mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                This will clear all your visited spots, favorites, and hidden restaurants. This action cannot be undone!
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={resetProgress}
                  className="flex-1 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Visit Confirmation Modal */}
      <AnimatePresence>
        {batchVisitData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border-4 p-8 text-center ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 ring-4 ring-slate-800' 
                  : 'bg-white border-white ring-4 ring-rose-100'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDarkMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-500'
              }`}>
                <Check className="w-8 h-8" />
              </div>
              <h2 className={`text-2xl font-display font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Mark All Locations?
              </h2>
              <p className={`mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                We noticed <strong>{batchVisitData.displayName}</strong> has multiple locations. Do you want to mark all of them as visited?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => confirmBatchVisit(true)}
                  className="w-full py-3 rounded-xl font-bold bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30"
                >
                  Yes, Mark All Visited
                </button>
                <button 
                  onClick={() => confirmBatchVisit(false)}
                  className={`w-full py-3 rounded-xl font-bold transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  No, Just This One
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Random Pick Modal */}
      <AnimatePresence>
        {randomPick && (
          <RandomPickModal 
            isOpen={!!randomPick} 
            onClose={() => setRandomPick(null)} 
            restaurant={randomPick}
            onToggleVisited={toggleVisited}
            onToggleFavorite={toggleFavorite}
            isVisited={visited.has(getRestaurantId(randomPick!))}
            isFavorite={favorites.has(getRestaurantId(randomPick!))}
          />
        )}
      </AnimatePresence>

      {/* Achievement Popup */}
      <AnimatePresence>
        {showAchievementPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <Confetti 
              width={typeof window !== 'undefined' ? window.innerWidth : 300} 
              height={typeof window !== 'undefined' ? window.innerHeight : 300} 
              numberOfPieces={500} 
              recycle={false} 
              gravity={0.2}
            />
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border-4 p-8 text-center relative ${
                isDarkMode 
                  ? 'bg-slate-800 border-yellow-500/50 ring-4 ring-yellow-500/20' 
                  : 'bg-white border-yellow-400 ring-4 ring-yellow-200'
              }`}
            >
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
                 <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(250,204,21,0.2)_2px,transparent_2px)] bg-[size:20px_20px]"></div>
              </div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-4 animate-bounce">
                  {showAchievementPopup.icon}
                </div>
                <h2 className="text-3xl font-display font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  Achievement Unlocked!
                </h2>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {showAchievementPopup.title}
                </h3>
                <p className={`mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {showAchievementPopup.description}
                </p>
                <button 
                  onClick={() => setShowAchievementPopup(null)}
                  className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] transition-transform"
                >
                  Awesome!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
