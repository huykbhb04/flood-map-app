import React, { useEffect, useRef, useState } from 'react';
import { StationData, StatusLevel } from '../types';
import { Search, Navigation, AlertTriangle, MapPin, Loader2, Crosshair } from 'lucide-react';

declare global {
  interface Window {
    L: any;
  }
}

interface Props {
  stations: StationData[];
  onStationSelect: (station: StationData) => void;
  selectedStationId?: string;
}

export const RealMap: React.FC<Props> = ({ stations, onStationSelect, selectedStationId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routeControlRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'found' | 'error' | 'denied'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [routeRisk, setRouteRisk] = useState<{ hasRisk: boolean; message: string } | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    // Default view Hanoi Center
    const map = L.map(mapContainerRef.current).setView([21.0285, 105.8542], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // 2. Auto-Locate User immediately on load
    locateUser(map);

  }, []); // Empty dependency array = run once on mount

  const locateUser = (mapInstance?: any) => {
    const map = mapInstance || mapInstanceRef.current;
    const L = window.L;
    
    setLocationStatus('locating');

    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationStatus('found');

        // Custom User Icon
        const userIcon = L.divIcon({
          className: 'custom-user-icon',
          html: `<div class="relative flex items-center justify-center w-6 h-6">
                   <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-75"></div>
                   <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        
        userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup("Your Location")
          .openPopup();
        
        map.setView([latitude, longitude], 15);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocationStatus('denied');
        
        // If GPS fails, default to Hanoi center so the app is usable
        if (map) {
           map.setView([21.0285, 105.8542], 13);
           // Set a fake location for demo purposes if real GPS fails
           // setUserLocation({ lat: 21.0285, lng: 105.8542 }); 
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 3. Update Station Markers on map
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    stations.forEach(station => {
      let colorClass = 'bg-emerald-500';
      let ringClass = '';
      
      if (station.status === StatusLevel.WARNING) {
        colorClass = 'bg-yellow-500';
        ringClass = 'ring-4 ring-yellow-500/30';
      } else if (station.status === StatusLevel.DANGER) {
        colorClass = 'bg-red-500';
        ringClass = 'ring-4 ring-red-500/40 animate-pulse';
      }

      const isSelected = station.id === selectedStationId;
      const scaleClass = isSelected ? 'scale-125 z-[100]' : 'z-[50]';

      const iconHtml = `
        <div class="relative group transition-all duration-300 ${scaleClass}">
           <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white ${colorClass} ${ringClass}">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>
           <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-medium">
             ${station.name} (${station.waterLevel}cm)
           </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      if (markersRef.current[station.id]) {
        markersRef.current[station.id].setLatLng([station.lat, station.lng]);
        markersRef.current[station.id].setIcon(customIcon);
      } else {
        const marker = L.marker([station.lat, station.lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => onStationSelect(station));
        markersRef.current[station.id] = marker;
      }
    });
  }, [stations, selectedStationId, onStationSelect]);

  // 4. Handle Address Search & Routing
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    // If no GPS, try to get it again, otherwise warn
    if (!userLocation) {
      alert("Please enable GPS or wait for location to be found before calculating a route.");
      locateUser();
      return;
    }
    
    setIsSearching(true);
    setRouteRisk(null);

    try {
      // Use Nominatim API to find coordinates
      // Append 'Hanoi Vietnam' to improve accuracy for local addresses
      const query = `${searchQuery}, Hanoi, Vietnam`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const destLat = parseFloat(data[0].lat);
        const destLon = parseFloat(data[0].lon);
        
        drawRoute(destLat, destLon);
      } else {
        alert("Address not found. Please be more specific.");
      }
    } catch (err) {
      console.error("Search failed", err);
      alert("Failed to search location.");
    } finally {
      setIsSearching(false);
    }
  };

  const drawRoute = (destLat: number, destLng: number) => {
    const L = window.L;
    if (!L || !mapInstanceRef.current || !userLocation) return;

    // Clean up previous route
    if (routeControlRef.current) {
      mapInstanceRef.current.removeControl(routeControlRef.current);
    }

    try {
        // Initialize Routing Machine
        routeControlRef.current = L.Routing.control({
          waypoints: [
            L.latLng(userLocation.lat, userLocation.lng),
            L.latLng(destLat, destLng)
          ],
          routeWhileDragging: false,
          showAlternatives: true,
          fitSelectedRoutes: true,
          show: true, // Show itinerary 
          lineOptions: {
            styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }] // Default Blue
          },
          createMarker: function(i: number, waypoint: any, n: number) {
            // Custom marker for Destination (last point)
            if (i === n - 1) {
              return L.marker(waypoint.latLng, {
                icon: L.divIcon({
                  className: 'dest-icon',
                  html: `<div class="w-8 h-8 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xl animate-bounce">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                         </div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 32]
                })
              });
            }
            return null; // Avoid default markers
          }
        }).addTo(mapInstanceRef.current);
    
        // 5. Flood Risk Analysis on Route
        routeControlRef.current.on('routesfound', function(e: any) {
          const routes = e.routes;
          if (!routes || routes.length === 0) return;
          
          const primaryRoute = routes[0];
          const coordinates = primaryRoute.coordinates; // Array of {lat, lng}
    
          let foundRisk = false;
          let riskStationName = "";
    
          // Check proximity of route points to DANGER/WARNING stations
          // Scan every 10th point for performance
          for (let i = 0; i < coordinates.length; i += 10) {
            const coord = coordinates[i];
            
            for (let station of stations) {
              if (station.status === StatusLevel.DANGER || station.status === StatusLevel.WARNING) {
                 // Simple Euclidean distance. Approx: 0.004 deg ~ 400-500m
                 const dLat = Math.abs(coord.lat - station.lat);
                 const dLng = Math.abs(coord.lng - station.lng);
                 
                 if (dLat < 0.004 && dLng < 0.004) {
                   foundRisk = true;
                   riskStationName = station.name;
                   break;
                 }
              }
            }
            if (foundRisk) break;
          }
    
          if (foundRisk) {
            setRouteRisk({ 
              hasRisk: true, 
              message: `Route passes near flooded area: ${riskStationName}. Avoid this route!` 
            });
            
            // Force style to red
            setTimeout(() => {
               const paths = document.querySelectorAll('path.leaflet-interactive');
               paths.forEach((path: any) => {
                  // Rough check to find the route path (usually blue)
                  const stroke = path.getAttribute('stroke');
                  if (stroke === '#3b82f6' || stroke === 'rgb(59, 130, 246)') {
                    path.setAttribute('stroke', '#ef4444'); // Red
                    path.classList.add('animate-pulse');
                  }
               });
            }, 200);
    
          } else {
            setRouteRisk({ 
              hasRisk: false, 
              message: "Route appears clear of reported floods." 
            });
          }
        });

    } catch (error) {
        console.error("Routing Error:", error);
        alert("Could not calculate route.");
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200 z-0">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100 z-0" />
      
      {/* UI Controls Overlay */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 w-[90%] max-w-sm">
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text" 
            placeholder="Where do you want to go? (e.g. 164 Vuong Thua Vu)" 
            className="w-full pl-10 pr-12 py-3 rounded-xl shadow-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/95 backdrop-blur text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-3.5 text-slate-400">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <Search className="h-5 w-5" />}
          </div>
          {/* Send Button inside input */}
          <button 
            type="submit"
            className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
          >
            <Navigation size={16} />
          </button>
        </form>

        {/* Risk Alert Card */}
        {routeRisk && (
          <div className={`p-4 rounded-xl shadow-xl border backdrop-blur-md animate-in slide-in-from-top-4 duration-500 ${
            routeRisk.hasRisk 
              ? 'bg-red-50/95 border-red-200 text-red-900' 
              : 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-start gap-3">
               <div className={`p-2 rounded-full ${routeRisk.hasRisk ? 'bg-red-100' : 'bg-emerald-100'}`}>
                 {routeRisk.hasRisk ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <MapPin className="h-5 w-5 text-emerald-600" />}
               </div>
               <div>
                 <h4 className="text-sm font-bold uppercase tracking-wide">
                   {routeRisk.hasRisk ? 'Flood Warning Detected' : 'Safe Route'}
                 </h4>
                 <p className="text-xs mt-1 leading-relaxed opacity-90 font-medium">{routeRisk.message}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Recenter GPS Button */}
      <div className="absolute bottom-6 right-4 z-[400]">
        <button 
          onClick={() => locateUser()}
          className="p-3 bg-white rounded-full shadow-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
          title="My Location"
        >
          <Crosshair className="h-6 w-6" />
        </button>
      </div>
      
      {/* GPS Status Badge */}
      <div className="absolute bottom-6 left-4 z-[400] bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-[10px] font-mono text-slate-500 shadow-sm flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${
            locationStatus === 'found' ? 'bg-emerald-500' :
            locationStatus === 'locating' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
         }`}></div>
         {locationStatus === 'found' && userLocation 
            ? `GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` 
            : locationStatus === 'locating' 
            ? 'Locating GPS...' 
            : locationStatus === 'denied' ? 'GPS Denied' : 'GPS Error'}
      </div>
    </div>
  );
};