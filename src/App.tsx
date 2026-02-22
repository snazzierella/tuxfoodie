import { useState, useEffect, useMemo, FC } from 'react';
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
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Helpers ---
const getRestaurantId = (r: Restaurant) => `${r.name}-${r.neighborhood}`;
const getGoogleSearchUrl = (r: Restaurant) => `https://www.google.com/search?q=${encodeURIComponent(`${r.name} restaurant Tucson ${r.neighborhood}`)}`;
const getPriceValue = (price: string) => price.length;

// --- Components ---

interface RestaurantCardProps {
  restaurant: Restaurant;
  isVisited: boolean;
  isFavorite: boolean;
  onToggleVisited: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const RestaurantCard: FC<RestaurantCardProps> = ({ 
  restaurant, 
  isVisited, 
  isFavorite,
  onToggleVisited,
  onToggleFavorite
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
          ? 'bg-teal-50/80 border-teal-200 shadow-sm' 
          : 'bg-white border-rose-100 shadow-sm shadow-rose-100 hover:shadow-md hover:shadow-rose-200 hover:-translate-y-1'
        }
      `}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`font-display text-xl font-bold leading-tight ${isVisited ? 'text-teal-700' : 'text-slate-700'}`}>
              {restaurant.name}
            </h3>
            {isVisited && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-teal-100 text-teal-600 border border-teal-200">
                Visited
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-y-2 gap-x-2 text-sm text-slate-500 mb-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Utensils className="w-3.5 h-3.5" />
              {restaurant.cuisine}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
              <MapPin className="w-3.5 h-3.5" />
              {restaurant.neighborhood}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {restaurant.distance} mi
            </span>
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {restaurant.price || 'N/A'}
            </span>
          </div>
          
          {restaurant.notes && (
            <div className="mt-4 relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-rose-200 rounded-full"></div>
              <p className="pl-3 text-sm text-slate-500 italic leading-relaxed">
                "{restaurant.notes}"
              </p>
            </div>
          )}
          
          <a 
            href={getGoogleSearchUrl(restaurant)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-rose-400 hover:text-rose-500 transition-colors bg-rose-50 px-3 py-1.5 rounded-full hover:bg-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Search className="w-3.5 h-3.5" />
            Find Info
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onToggleVisited(getRestaurantId(restaurant))}
            className={`
              flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border-2
              ${isVisited 
                ? 'bg-teal-400 border-teal-400 text-white shadow-lg shadow-teal-200 scale-110' 
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
                : 'bg-white border-slate-100 text-slate-300 hover:border-rose-200 hover:text-rose-300'
              }
            `}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-5 h-5 stroke-[3] ${isFavorite ? 'fill-current' : ''}`} />
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

  const [search, setSearch] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [visitedFilter, setVisitedFilter] = useState('All'); // All, Visited, Not Visited
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('distance-asc'); // distance-asc, distance-desc, price-asc, price-desc
  const [maxDistance, setMaxDistance] = useState(30);
  const [showFilters, setShowFilters] = useState(false);
  const [randomPick, setRandomPick] = useState<Restaurant | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('tuxfoodie-visited', JSON.stringify([...visited]));
  }, [visited]);

  useEffect(() => {
    localStorage.setItem('tuxfoodie-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

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
      
      const matchesVisited = visitedFilter === 'All' 
        ? true 
        : visitedFilter === 'Visited' 
          ? visited.has(id) 
          : !visited.has(id);
          
      const matchesFavorites = favoritesOnly ? favorites.has(id) : true;
      
      return matchesSearch && matchesNeighborhood && matchesCuisine && matchesPrice && matchesDistance && matchesVisited && matchesFavorites;
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
  }, [search, selectedNeighborhood, selectedCuisine, selectedPrice, maxDistance, visitedFilter, favoritesOnly, sortBy, visited, favorites]);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const visitedCount = visited.size;
    const percentage = Math.round((visitedCount / total) * 100);
    return { total, visitedCount, percentage };
  }, [visited]);

  // Handlers
  const toggleVisited = (id: string) => {
    setVisited(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRandomPick = () => {
    const unvisited = restaurants.filter(r => !visited.has(getRestaurantId(r)));
    if (unvisited.length === 0) {
      alert("Wow! You've visited everywhere! Reset your progress to start over.");
      return;
    }
    const random = unvisited[Math.floor(Math.random() * unvisited.length)];
    setRandomPick(random);
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-700 font-sans pb-32 selection:bg-rose-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-rose-50/90 backdrop-blur-lg border-b border-rose-100">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-display text-3xl font-black text-slate-800 tracking-tight">
                TUXFOODIE <span className="text-rose-400">MEGAMAP</span>
              </h1>
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1 ml-1">
                Sanctuary Chapter • Tucson, AZ
              </p>
            </div>
            <div className="text-right bg-white px-4 py-2 rounded-2xl shadow-sm shadow-rose-100 border border-rose-50">
              <div className="flex items-center justify-end gap-1.5 text-teal-500 font-black text-lg leading-none">
                <Trophy className="w-5 h-5" />
                <span>{stats.percentage}%</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Mastery</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-rose-100 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.percentage}%` }}
              className="h-full bg-gradient-to-r from-teal-300 to-teal-400 rounded-full"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-5 py-8">
        
        {/* Search & Filter Toggle */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300 group-focus-within:text-rose-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search for cravings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-rose-100 rounded-full focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100 text-slate-600 placeholder:text-rose-200 shadow-sm shadow-rose-50 transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 rounded-full border-2 transition-all flex items-center gap-2 font-bold shadow-sm ${
              showFilters 
                ? 'bg-slate-800 text-white border-slate-800 shadow-slate-200' 
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
              <div className="bg-white p-6 rounded-[2rem] border-2 border-rose-100 shadow-lg shadow-rose-50/50 space-y-6">
                
                {/* Toggles Row */}
                <div className="flex flex-wrap gap-6 pb-6 border-b-2 border-rose-50">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-rose-300 uppercase tracking-wider ml-1">Status</label>
                    <div className="flex bg-rose-50 rounded-2xl p-1.5">
                      {['All', 'Visited', 'Not Visited'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setVisitedFilter(option)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            visitedFilter === option 
                              ? 'bg-white text-rose-500 shadow-sm shadow-rose-100' 
                              : 'text-rose-300 hover:text-rose-400'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-rose-300 uppercase tracking-wider ml-1">Favorites</label>
                    <button
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                      className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border-2 transition-all h-[42px] ${
                        favoritesOnly
                          ? 'bg-rose-100 border-rose-200 text-rose-500'
                          : 'bg-white border-rose-100 text-slate-400 hover:border-rose-200'
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
                    <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 ml-1">Sort By</label>
                    <div className="relative">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-3 pl-10 bg-rose-50 border-2 border-rose-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:border-rose-300 appearance-none cursor-pointer hover:bg-rose-100 transition-colors"
                      >
                        <option value="distance-asc">Distance (Nearest First)</option>
                        <option value="distance-desc">Distance (Furthest First)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                      </select>
                      <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2 px-1">
                      <span className="font-bold text-rose-300 uppercase text-xs tracking-wider">Max Distance</span>
                      <span className="text-rose-500 font-bold bg-rose-100 px-2 py-0.5 rounded-lg">{maxDistance} mi</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={maxDistance} 
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className="w-full h-3 bg-rose-100 rounded-full appearance-none cursor-pointer accent-rose-400 hover:accent-rose-500"
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
                      <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 ml-1">{filter.label}</label>
                      <select 
                        value={filter.value}
                        onChange={(e) => filter.setter(e.target.value)}
                        className="w-full p-3 bg-white border-2 border-rose-100 rounded-2xl text-sm font-medium text-slate-600 focus:outline-none focus:border-rose-300 cursor-pointer hover:border-rose-200 transition-colors"
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
            <div className="text-center py-16 text-rose-200">
              <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-rose-100">
                <Utensils className="w-10 h-10 opacity-50" />
              </div>
              <p className="font-display text-xl font-bold text-rose-300">No yummy spots found!</p>
              <p className="text-slate-400 text-sm mt-2">Try adjusting your filters to find more treats.</p>
            </div>
          ) : (
            filteredRestaurants.map(r => (
              <RestaurantCard 
                key={getRestaurantId(r)} 
                restaurant={r} 
                isVisited={visited.has(getRestaurantId(r))}
                isFavorite={favorites.has(getRestaurantId(r))}
                onToggleVisited={toggleVisited}
                onToggleFavorite={toggleFavorite}
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
        className="fixed bottom-8 right-8 w-16 h-16 bg-rose-400 text-white rounded-full shadow-2xl shadow-rose-300 flex items-center justify-center z-40 border-4 border-white ring-4 ring-rose-100"
      >
        <Dices className="w-8 h-8" />
      </motion.button>

      {/* Random Pick Modal */}
      <AnimatePresence>
        {randomPick && (
          <RandomPickModal 
            isOpen={!!randomPick} 
            onClose={() => setRandomPick(null)} 
            restaurant={randomPick}
            isVisited={visited.has(getRestaurantId(randomPick))}
            isFavorite={favorites.has(getRestaurantId(randomPick))}
            onToggleVisited={toggleVisited}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
