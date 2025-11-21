
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Waves, Search, Bell, Navigation, MapPin, AlertTriangle, ShieldAlert, Crosshair, ArrowRight, Clock, X, Car, RotateCcw, Bike } from 'lucide-react';
import DashboardStats from './components/DashboardStats';
import MapComponent from './components/MapComponent';
import StationDetailPanel from './components/StationDetailPanel';
import { MOCK_STATIONS } from './constants';
import { Station, DashboardStats as StatsType, Status, RouteInfo, SearchResult, VehicleType } from './types';
import { fetchBlynkData } from './services/blynkService';
import { searchAddress } from './services/geocodingService';

const App: React.FC = () => {
  const [stations, setStations] = useState<Station[]>(MOCK_STATIONS);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationFilter, setStationFilter] = useState(''); // Filter for station list
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  
  // Location & Navigation State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [avoidFloodMode, setAvoidFloodMode] = useState(false);
  
  // Vehicle Selection
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.MOTORBIKE);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Polling Effect for Blynk Data
  useEffect(() => {
    const pollStations = async () => {
      // Fetch data for all stations with tokens
      const updates = await Promise.all(stations.map(async (station) => {
        if (station.blynkToken) {
          const data = await fetchBlynkData(station.blynkToken);
          if (data) {
            let newStatus = Status.SAFE;
            if (data.currentLevel >= 20 || data.currentLevel >= data.threshold) {
              newStatus = Status.DANGER;
            } else if (data.currentLevel >= 5) {
              newStatus = Status.WARNING;
            }

            const newHistoryPoint = {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              level: data.currentLevel
            };
            
            const updatedHistory = [...station.history, newHistoryPoint].slice(-20);

            return {
              ...station,
              currentLevel: data.currentLevel,
              threshold: data.threshold,
              isAutoWarning: data.isAutoWarning,
              status: newStatus,
              history: updatedHistory,
              lastUpdated: new Date().toISOString()
            };
          }
        }
        return station;
      }));

      setStations(prev => {
        // Only update if data actually changed to prevent re-renders (simplified check)
        return JSON.stringify(prev) !== JSON.stringify(updates) ? updates : prev;
      });
    };

    pollStations();
    const intervalId = setInterval(pollStations, 5000);
    return () => clearInterval(intervalId);
  }, []); 

  // Sync selectedStation with realtime updates from stations array
  useEffect(() => {
    if (selectedStation) {
      const updatedStation = stations.find(s => s.id === selectedStation.id);
      if (updatedStation && updatedStation !== selectedStation) {
        setSelectedStation(updatedStation);
      }
    }
  }, [stations, selectedStation]);

  // GPS Location Handler
  const handleLocateUser = () => {
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Error getting location", error);
        // Mock location for demo if fails
        setUserLocation([20.985, 105.795]); 
        setLoadingLocation(false);
      }
    );
  };

  // Address Search Handler
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchQuery.length > 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchAddress(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      }, 800);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setDestination([lat, lng]);
    setDestinationName(result.display_name.split(',')[0]); // Short name
    setSearchQuery('');
    setSearchResults([]);
    setAvoidFloodMode(false); // Reset avoid mode on new search
    
    if (!isNavigating) {
      setIsNavigating(true);
    }
    if (!userLocation) {
      handleLocateUser();
    }
  };

  const handleClearNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    setRouteInfo(null);
    setDestinationName('');
    setSearchQuery('');
    setAvoidFloodMode(false);
  };

  const toggleNavigationMode = () => {
    if (!isNavigating) {
      setIsNavigating(true);
      if (!userLocation) {
        handleLocateUser();
      }
    } else {
      handleClearNavigation();
    }
  };

  // Stats
  const stats: StatsType = useMemo(() => {
    return {
      activeNodes: stations.length,
      safeZones: stations.filter(s => s.status === Status.SAFE).length,
      warnings: stations.filter(s => s.status === Status.WARNING).length,
      criticalDanger: stations.filter(s => s.status === Status.DANGER).length,
    };
  }, [stations]);

  const filteredStations = useMemo(() => {
    if (!stationFilter) return stations;
    const lower = stationFilter.toLowerCase();
    return stations.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      s.location.toLowerCase().includes(lower) ||
      s.id.toLowerCase().includes(lower)
    );
  }, [stations, stationFilter]);

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col overflow-hidden font-sans">
      {/* Navbar */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Waves className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">FloodGuard IoT</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Real-time Monitoring System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Station Search (Filter) */}
          <div className="hidden md:flex items-center bg-slate-900/50 rounded-lg border border-slate-600 px-3 py-1.5 focus-within:border-blue-500 transition-colors">
             <Search size={16} className="text-slate-400 mr-2" />
             <input 
               type="text" 
               placeholder="Filter sensors..." 
               className="bg-transparent border-none outline-none text-sm text-white w-48 placeholder:text-slate-500"
               value={stationFilter}
               onChange={(e) => setStationFilter(e.target.value)}
             />
          </div>

          <div className="relative cursor-pointer group">
            <div className="bg-slate-700 p-2 rounded-full text-slate-300 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Bell size={20} />
              {stats.criticalDanger > 0 && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="hidden sm:inline text-xs font-medium text-emerald-400">System Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        
        {/* Left: Dashboard & Map */}
        {/* Fixed: Removed mr-[350px] which caused the large gap. Flexbox will handle the spacing. */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedStation ? 'hidden lg:flex' : ''}`}>
          
          {!isNavigating && <DashboardStats stats={stats} />}

          <div className="flex-1 bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-1 relative flex flex-col overflow-hidden">
            
            {/* --- MAP OVERLAY CONTROLS --- */}
            <div className="absolute top-4 left-4 z-[20] flex flex-col gap-3 w-full max-w-md pointer-events-none">
               
               {/* 1. Navigation Input Panel */}
               <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-600 pointer-events-auto overflow-hidden">
                 {isNavigating ? (
                   <div className="p-3 space-y-2 animate-in slide-in-from-top-2">
                      {/* Vehicle Selection */}
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2">
                         <button 
                           onClick={() => {
                             setVehicleType(VehicleType.MOTORBIKE);
                             setAvoidFloodMode(false); // Reset to trigger recalc check
                           }}
                           className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-colors ${vehicleType === VehicleType.MOTORBIKE ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           <Bike size={14} /> Motorbike
                         </button>
                         <button 
                           onClick={() => {
                             setVehicleType(VehicleType.CAR);
                             setAvoidFloodMode(false);
                           }}
                           className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-colors ${vehicleType === VehicleType.CAR ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           <Car size={14} /> Car
                         </button>
                      </div>

                      {/* FROM */}
                      <div className="flex items-center gap-3">
                        <div className="w-4 flex flex-col items-center gap-1">
                           <div className="w-3 h-3 rounded-full border-2 border-blue-500"></div>
                           <div className="w-0.5 h-6 bg-gray-300 dark:bg-slate-600 border-dotted"></div>
                        </div>
                        <div className="flex-1 relative">
                           <input 
                             type="text" 
                             value="My Location" 
                             readOnly
                             className="w-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-sm px-3 py-2 rounded border border-transparent"
                           />
                           <button onClick={handleLocateUser} className="absolute right-2 top-2 text-blue-500 hover:text-blue-400">
                             <Crosshair size={16} />
                           </button>
                        </div>
                      </div>

                      {/* TO */}
                      <div className="flex items-center gap-3">
                        <div className="w-4 flex justify-center">
                           <MapPin size={16} className="text-red-500 fill-red-500" />
                        </div>
                        <div className="flex-1 relative group">
                           <input 
                             type="text" 
                             placeholder="Search destination..."
                             value={searchQuery || destinationName}
                             onChange={(e) => {
                               setSearchQuery(e.target.value);
                               if (destinationName) setDestinationName(''); 
                             }}
                             className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-3 py-2 rounded border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                           />
                           {searchQuery && (
                             <button 
                               onClick={() => setSearchQuery('')}
                               className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                             >
                               <X size={16} />
                             </button>
                           )}
                        </div>
                      </div>

                      {/* Search Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-30">
                          {searchResults.map((result) => (
                            <div 
                              key={result.place_id}
                              onClick={() => handleSelectSearchResult(result)}
                              className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                            >
                              <MapPin size={18} className="text-slate-400 mt-0.5" />
                              <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{result.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                 ) : (
                   /* Simple Search Bar (Initial State) */
                   <div className="flex items-center p-1">
                     <div className="p-2 text-slate-400">
                       <Search size={20} />
                     </div>
                     <input 
                       type="text"
                       placeholder="Search destination..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder:text-slate-400 h-10 text-sm"
                     />
                     <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2"></div>
                     <button 
                        onClick={toggleNavigationMode} 
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                        title="Directions"
                     >
                       <Navigation size={20} className="rotate-90 fill-blue-500 text-blue-500" />
                     </button>
                   </div>
                 )}
                 
                 {/* Dropdown for Simple Search Bar */}
                 {!isNavigating && searchResults.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto bg-white dark:bg-slate-800">
                      {searchResults.map((result) => (
                        <div 
                          key={result.place_id}
                          onClick={() => handleSelectSearchResult(result)}
                          className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-start gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <MapPin size={18} className="text-slate-400 mt-0.5" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">{result.display_name}</span>
                        </div>
                      ))}
                    </div>
                 )}
               </div>

               {/* Back Button when Navigating */}
               {isNavigating && (
                 <button 
                   onClick={handleClearNavigation}
                   className="self-start bg-slate-800 text-white px-3 py-1.5 rounded shadow border border-slate-600 text-xs font-bold flex items-center gap-1 hover:bg-slate-700 pointer-events-auto"
                 >
                   <ArrowRight className="rotate-180" size={14} /> Exit Navigation
                 </button>
               )}
            </div>

            {/* 2. Bottom Sheet / Route Summary Card */}
            {isNavigating && routeInfo && (
               <div className="absolute bottom-6 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[20] animate-in slide-in-from-bottom-10">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                     
                     {/* Route Status Banner */}
                     <div className={`px-4 py-2 flex items-center gap-2 ${routeInfo.isFlooded ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {routeInfo.isFlooded ? <AlertTriangle size={18} fill="white" /> : <ShieldAlert size={18} />}
                        <span className="font-bold text-sm uppercase">
                           {routeInfo.isFlooded ? 'Flood Warning: Route Unsafe' : 'Route Clear & Safe'}
                        </span>
                     </div>

                     <div className="p-4">
                        <div className="flex justify-between items-end mb-4">
                           <div>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-3xl font-black ${routeInfo.isFlooded ? 'text-red-500' : 'text-blue-500'}`}>
                                  {Math.ceil(routeInfo.duration / 60)}
                                </span>
                                <span className="text-sm font-bold text-slate-500">min</span>
                              </div>
                              <div className="text-slate-500 text-sm font-medium">
                                {(routeInfo.distance / 1000).toFixed(1)} km • Fastest route
                              </div>
                           </div>
                           <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-500">
                             {vehicleType === VehicleType.CAR ? <Car size={24} /> : <Bike size={24} />}
                           </div>
                        </div>

                        {routeInfo.isFlooded && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg p-3 mb-4">
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">High water levels detected near:</p>
                            <ul className="text-xs text-red-800 dark:text-red-300 space-y-1">
                              {routeInfo.affectedStations.map(s => (
                                <li key={s} className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                  {s}
                                </li>
                              ))}
                            </ul>
                            {!avoidFloodMode && (
                              <button 
                                onClick={() => setAvoidFloodMode(true)}
                                className="mt-3 w-full py-2 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                              >
                                <RotateCcw size={12} /> Suggest Safer Route
                              </button>
                            )}
                            {avoidFloodMode && (
                              <div className="mt-2 text-xs text-slate-500 italic text-center">
                                Calculating detour around flood...
                              </div>
                            )}
                          </div>
                        )}

                        <button className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${routeInfo.isFlooded && !avoidFloodMode ? 'bg-slate-500 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-500'}`}>
                           <Navigation size={18} className="fill-current" />
                           {avoidFloodMode ? 'Navigate Detour' : 'Start Navigation'}
                        </button>
                     </div>
                  </div>
               </div>
            )}
            
            {/* GPS Button */}
            <div className="absolute bottom-8 right-4 md:bottom-8 md:right-[400px] z-[10]">
               <button 
                  onClick={handleLocateUser}
                  disabled={loadingLocation}
                  className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-slate-800 dark:text-white p-3 rounded-full shadow-xl border border-slate-200 dark:border-slate-600 transition-colors flex items-center justify-center"
                  title="Locate Me"
               >
                  {loadingLocation ? (
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Crosshair size={24} />
                  )}
               </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded overflow-hidden z-0">
               <MapComponent 
                 stations={filteredStations} 
                 onStationSelect={(s) => {
                   setSelectedStation(s);
                   setIsMobilePanelOpen(true);
                 }}
                 selectedStationId={selectedStation?.id}
                 userLocation={userLocation}
                 destination={destination}
                 onSetDestination={(latlng) => {
                   setDestination(latlng);
                   setDestinationName('Marked Location');
                   if(!isNavigating) toggleNavigationMode();
                 }}
                 isNavigating={isNavigating}
                 onRouteFound={setRouteInfo}
                 avoidFloodMode={avoidFloodMode}
                 vehicleType={vehicleType}
               />
            </div>
          </div>
        </div>

        {/* Right: Detail Panel (Desktop) */}
        {selectedStation && (
          <div className="hidden lg:block w-[400px] animate-in slide-in-from-right-10 duration-300 h-full shrink-0">
            <StationDetailPanel 
              station={selectedStation} 
              onClose={() => setSelectedStation(null)} 
            />
          </div>
        )}

        {/* Mobile Overlay Panel */}
        {selectedStation && isMobilePanelOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
             <div className="w-full max-w-md h-full bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
                <StationDetailPanel 
                  station={selectedStation} 
                  onClose={() => {
                    setSelectedStation(null);
                    setIsMobilePanelOpen(false);
                  }}
                />
             </div>
          </div>
        )}

      </main>

    </div>
  );
};

export default App;
