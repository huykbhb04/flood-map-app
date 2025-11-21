
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { Station, Status, RouteInfo, VehicleType } from '../types';
import { MAP_CENTER_HANOI, DEFAULT_ZOOM, STATUS_COLORS } from '../constants';
// @ts-ignore
import L from 'leaflet';
import 'leaflet-routing-machine';

// --- Components ---

// 1. Helper to move map programmatically
const MapController: React.FC<{ center?: [number, number] | null }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, map]);

  return null;
};

// 2. Helper for clicking on the map to set destination
const MapClickHandler: React.FC<{ onMapClick?: (latlng: [number, number]) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
};

// 3. Routing Machine Component
interface RoutingProps {
  start: [number, number];
  end: [number, number];
  stations: Station[];
  onRouteFound: (info: RouteInfo) => void;
  avoidFloodMode: boolean;
  vehicleType: VehicleType;
}

const RoutingMachine: React.FC<RoutingProps> = ({ start, end, stations, onRouteFound, avoidFloodMode, vehicleType }) => {
  const map = useMap();
  const controlRef = useRef<any>(null);
  const dangerLayerRef = useRef<L.LayerGroup | null>(null);
  
  // State management refs
  const detourAppliedRef = useRef(false);
  const detourFailedRef = useRef(false);
  const isAnalyzingRef = useRef(false);
  const propsRef = useRef({ start, end, stations, avoidFloodMode, vehicleType, onRouteFound });

  // Keep props ref updated for event listeners
  useEffect(() => {
    propsRef.current = { start, end, stations, avoidFloodMode, vehicleType, onRouteFound };
  }, [start, end, stations, avoidFloodMode, vehicleType, onRouteFound]);

  // --- Helper: Flood Detection Logic ---
  const detectFloodRisks = (coordinates: any[], stations: Station[], vehicleType: VehicleType) => {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) return [];

    const DANGER_RADIUS_METERS = 500;
    const detectedSegments: { startIndex: number; endIndex: number; causingStation: Station }[] = [];
    
    let currentSegmentStart = -1;
    let currentStation: Station | null = null;

    const isStationRisky = (s: Station) => {
         if (vehicleType === VehicleType.MOTORBIKE) {
           return s.status === Status.DANGER || s.status === Status.WARNING;
         }
         return s.status === Status.DANGER;
    };

    for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        // Defensive check: Ensure coordinate exists
        if (!coord) continue; 

        try {
            // Safe creation of LatLng
            const point = L.latLng(coord);
            if (!point) continue;
            
            let isPointDangerous = false;
            let nearestStation: Station | null = null;
            let minDist = Infinity;

            for (const s of stations) {
                if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;

                if (isStationRisky(s)) {
                    const sLoc = L.latLng(s.lat, s.lng);
                    const dist = point.distanceTo(sLoc);
                    if (dist < DANGER_RADIUS_METERS) {
                        isPointDangerous = true;
                        if (dist < minDist) {
                            minDist = dist;
                            nearestStation = s;
                        }
                    }
                }
            }

            if (isPointDangerous) {
                if (currentSegmentStart === -1) {
                    currentSegmentStart = i;
                    currentStation = nearestStation;
                } else if (currentStation && nearestStation && nearestStation.id !== currentStation.id && minDist < DANGER_RADIUS_METERS/2) {
                    currentStation = nearestStation;
                }
            } else {
                if (currentSegmentStart !== -1 && currentStation) {
                    detectedSegments.push({
                        startIndex: currentSegmentStart,
                        endIndex: i - 1,
                        causingStation: currentStation
                    });
                    currentSegmentStart = -1;
                    currentStation = null;
                }
            }
        } catch (e) {
            // invalid coordinate, skip
            continue;
        }
    }
    
    if (currentSegmentStart !== -1 && currentStation) {
        detectedSegments.push({
            startIndex: currentSegmentStart,
            endIndex: coordinates.length - 1,
            causingStation: currentStation
        });
    }
    return detectedSegments;
  };

  // --- Helper: Calculate Route Score ---
  const calculateRouteScore = (route: any, stations: Station[], vehicleType: VehicleType) => {
     if (!route || !route.coordinates) return { score: Infinity, exposure: Infinity, distance: Infinity };

     const segments = detectFloodRisks(route.coordinates, stations, vehicleType);
     let floodExposureMeters = 0;
     
     segments.forEach(seg => {
         if (!route.coordinates[seg.startIndex] || !route.coordinates[seg.endIndex]) return;
         try {
             const p1 = route.coordinates[seg.startIndex];
             const p2 = route.coordinates[seg.endIndex];
             
             const pStart = L.latLng(p1);
             const pEnd = L.latLng(p2);
             floodExposureMeters += pStart.distanceTo(pEnd);
         } catch (e) {
             // Ignore calculation errors
         }
     });

     const totalDistance = route.summary.totalDistance;
     // Penalize flood heavily
     const FLOOD_PENALTY_MULTIPLIER = 50; 
     
     return {
         score: totalDistance + (floodExposureMeters * FLOOD_PENALTY_MULTIPLIER),
         exposure: floodExposureMeters,
         distance: totalDistance
     };
  };

  // --- Initialize Routing Control ---
  useEffect(() => {
    if (!map) return;

    if (!dangerLayerRef.current) {
      dangerLayerRef.current = L.layerGroup().addTo(map);
    }

    if (!controlRef.current) {
      const control = L.Routing.control({
        waypoints: [
          L.latLng(start[0], start[1]),
          L.latLng(end[0], end[1])
        ],
        lineOptions: {
          styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }],
          extendToWaypoints: false,
          missingRouteTolerance: 0
        },
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        createMarker: () => null
      } as any);

      // EVENT: Routes Found
      control.on('routesfound', async function(e: any) {
        const { stations, avoidFloodMode, vehicleType, onRouteFound, start, end } = propsRef.current;
        const route = e.routes[0];
        const coordinates = route.coordinates;

        if (!coordinates || coordinates.length === 0) return;

        // 1. Analyze Danger
        const detectedDangerSegments = detectFloodRisks(coordinates, stations, vehicleType);

        // 2. Visualize Danger (Always visualize, whether base or detour)
        if (dangerLayerRef.current) {
            dangerLayerRef.current.clearLayers();
            detectedDangerSegments.forEach(seg => {
                const segCoords = coordinates.slice(seg.startIndex, seg.endIndex + 1);
                if (segCoords.length > 1 && dangerLayerRef.current) {
                    L.polyline(segCoords, { color: '#ef4444', weight: 7 }).addTo(dangerLayerRef.current);
                }
            });
        }

        // 3. Report Status to UI
        const affectedNames = [...new Set(detectedDangerSegments.map(s => s.causingStation.name))];
        let summaryText = route.name;
        
        // If we failed to find a detour and we are in avoid mode with flood, update message
        if (avoidFloodMode && detectedDangerSegments.length > 0 && detourFailedRef.current) {
             summaryText = "No safe detour found. Showing original route.";
        }

        onRouteFound({
            distance: route.summary.totalDistance,
            duration: route.summary.totalTime,
            summary: summaryText,
            isFlooded: detectedDangerSegments.length > 0,
            affectedStations: affectedNames
        });

        // 4. Detour Logic
        // Conditions: Mode ON, Danger Exists, Not already detouring, Not failed previously, Not analyzing
        if (avoidFloodMode && detectedDangerSegments.length > 0 && !detourAppliedRef.current && !detourFailedRef.current && !isAnalyzingRef.current) {
            isAnalyzingRef.current = true;
            console.log("Flood detected. Initiating smart detour search...");

            try {
                const router = control.getRouter();
                if (!router) {
                    console.warn("Router not available");
                    isAnalyzingRef.current = false;
                    return;
                }

                const segment = detectedDangerSegments[0]; // Fix the first major flood
                
                // Defensive check for segment
                if (!segment || !segment.causingStation) {
                    console.warn("Invalid flood segment detected");
                    isAnalyzingRef.current = false;
                    return;
                }

                // Safe Anchors (P_start, P_end)
                const BUFFER = 5; // small buffer indices
                const idxStart = Math.max(0, segment.startIndex - BUFFER);
                const idxEnd = Math.min(coordinates.length - 1, segment.endIndex + BUFFER);
                
                // Defensive check: index bounds
                if (idxStart >= coordinates.length || idxEnd < 0 || idxStart > idxEnd) {
                    console.warn("Could not find valid anchors for detour. Indices:", idxStart, idxEnd);
                    isAnalyzingRef.current = false;
                    return;
                }

                // --- NEW: Lấy toạ độ thô & kiểm tra kỹ trước khi dùng .lng/.lat ---
                const rawStart = coordinates[idxStart];
                const rawEnd = coordinates[idxEnd];

                if (!rawStart || !rawEnd) {
                    console.warn("Anchor coordinates are undefined:", rawStart, rawEnd);
                    isAnalyzingRef.current = false;
                    return;
                }

                // Hỗ trợ cả 2 dạng: [lat, lng] hoặc { lat, lng }
                const sLat = Array.isArray(rawStart) ? rawStart[0] : rawStart.lat;
                const sLng = Array.isArray(rawStart) ? rawStart[1] : rawStart.lng;
                const eLat = Array.isArray(rawEnd) ? rawEnd[0] : rawEnd.lat;
                const eLng = Array.isArray(rawEnd) ? rawEnd[1] : rawEnd.lng;

                // Nếu thiếu lat/lng hợp lệ → bỏ detour
                if (
                  typeof sLat !== "number" ||
                  typeof sLng !== "number" ||
                  typeof eLat !== "number" ||
                  typeof eLng !== "number"
                ) {
                  console.warn("Invalid anchor coordinate values:", rawStart, rawEnd);
                  isAnalyzingRef.current = false;
                  return;
                }

                const pStart = L.latLng(sLat, sLng);
                const pEnd = L.latLng(eLat, eLng);
                const startLatLng = L.latLng(start[0], start[1]);
                const endLatLng = L.latLng(end[0], end[1]);

                // --- Đảm bảo anchors hợp lệ trước khi dùng ---
                if (!pStart || !pEnd) {
                  console.warn("L.latLng failed to create anchors for detour.");
                  isAnalyzingRef.current = false;
                  return;
                }

                const baseMetrics = calculateRouteScore(route, stations, vehicleType);

                // --- Strategy A: Smart Midpoint Offset ---
                const midLat = (pStart.lat + pEnd.lat) / 2;
                const midLng = (pStart.lng + pEnd.lng) / 2;
                const vecLat = pEnd.lat - pStart.lat;
                const vecLng = pEnd.lng - pStart.lng;
                
                let segLen = Math.sqrt(vecLat * vecLat + vecLng * vecLng);
                if (!isFinite(segLen) || segLen === 0) {
                    console.warn("Zero-length segment for detour, skipping.");
                    isAnalyzingRef.current = false;
                    return;
                }

                const nLat = -vecLng / segLen; // Perpendicular
                const nLng = vecLat / segLen;

                const offsets = [
                    0.002, -0.002, // ~220m
                    0.004, -0.004, // ~440m
                    0.006, -0.006  // ~660m
                ];

                const candidates = offsets.map(offset => {
                    return L.latLng(midLat + nLat * offset, midLng + nLng * offset);
                });

                // --- Strategy B: Fallback (Perpendicular Push from Closest Point) ---
                // Find point in segment closest to station
                let closestIdx = -1;
                let minStationDist = Infinity;
                
                // Defensive: ensure causingStation has valid lat/lng
                if (typeof segment.causingStation.lat === 'number' && typeof segment.causingStation.lng === 'number') {
                    const stationLoc = L.latLng(segment.causingStation.lat, segment.causingStation.lng);
                    
                    for(let i = segment.startIndex; i <= segment.endIndex; i++) {
                        if (!coordinates[i]) continue;
                        try {
                            const pt = L.latLng(coordinates[i]);
                            const d = pt.distanceTo(stationLoc);
                            if(d < minStationDist) {
                                minStationDist = d;
                                closestIdx = i;
                            }
                        } catch(e) { continue; }
                    }
                    
                    if (closestIdx !== -1 && coordinates[closestIdx]) {
                        try {
                            const cCurrRaw = coordinates[closestIdx];
                            const cCurr = L.latLng(cCurrRaw);
                            if (!cCurr) throw new Error("Invalid current point");
                            
                            // Estimate direction (tangent)
                            const iPrev = Math.max(0, closestIdx - 1);
                            const iNext = Math.min(coordinates.length - 1, closestIdx + 1);
                            
                            // Robust neighbor access
                            let cPrev = cCurr;
                            if (coordinates[iPrev]) {
                                try { 
                                    const p = L.latLng(coordinates[iPrev]); 
                                    if (p) cPrev = p;
                                } catch (e) {}
                            }

                            let cNext = cCurr;
                            if (coordinates[iNext]) {
                                try { 
                                    const n = L.latLng(coordinates[iNext]); 
                                    if (n) cNext = n;
                                } catch (e) {}
                            }
                            
                            // Vector along route
                            let dirLat = 0; 
                            let dirLng = 0;

                            if (cNext && cPrev) {
                                dirLat = cNext.lat - cPrev.lat;
                                dirLng = cNext.lng - cPrev.lng;
                            }
                            
                            let len = Math.sqrt(dirLat*dirLat + dirLng*dirLng);
                            
                            // If very small length, try one-sided
                            if (len < 1e-9 && cNext) {
                                dirLat = cNext.lat - cCurr.lat;
                                dirLng = cNext.lng - cCurr.lng;
                                len = Math.sqrt(dirLat*dirLat + dirLng*dirLng);
                            }

                            let perpLat = 0;
                            let perpLng = 0;

                            if (len > 1e-9) {
                                // Normalize direction
                                dirLat /= len;
                                dirLng /= len;
                                
                                // Two perpendiculars: (-y, x) and (y, -x)
                                const p1Lat = -dirLng;
                                const p1Lng = dirLat;
                                const p2Lat = dirLng;
                                const p2Lng = -dirLat;
                                
                                // Vector Station -> Point
                                const sToPLat = cCurr.lat - stationLoc.lat;
                                const sToPLng = cCurr.lng - stationLoc.lng;
                                
                                // Use dot product to choose perpendicular moving AWAY from station
                                const dot1 = p1Lat * sToPLat + p1Lng * sToPLng;
                                
                                if (dot1 >= 0) {
                                    perpLat = p1Lat;
                                    perpLng = p1Lng;
                                } else {
                                    perpLat = p2Lat;
                                    perpLng = p2Lng;
                                }
                            } else {
                                // Fallback: just push away radially
                                const sToPLat = cCurr.lat - stationLoc.lat;
                                const sToPLng = cCurr.lng - stationLoc.lng;
                                const sLen = Math.sqrt(sToPLat*sToPLat + sToPLng*sToPLng) || 1;
                                perpLat = sToPLat / sLen;
                                perpLng = sToPLng / sLen;
                            }
                            
                            const FALLBACK_DIST = 0.006; // ~600-700m
                            const fallbackPoint = L.latLng(
                                cCurr.lat + perpLat * FALLBACK_DIST,
                                cCurr.lng + perpLng * FALLBACK_DIST
                            );
                            
                            candidates.push(fallbackPoint);
                        } catch(e) {
                            console.warn("Fallback vector calc failed", e);
                        }
                    }
                }

                // --- Evaluate All Candidates ---
                const promises = candidates.map(async (detourPoint) => {
                    if (!detourPoint) return null;
                    
                    // Collect LatLng points for the route
                    const points = [startLatLng];
                    // Use anchors to force local detour
                    if (startLatLng.distanceTo(pStart) > 200) points.push(pStart);
                    points.push(detourPoint);
                    if (endLatLng.distanceTo(pEnd) > 200) points.push(pEnd);
                    points.push(endLatLng);

                    // router.route expects Waypoint objects { latLng: ... } not LatLng objects
                    const routeWaypoints = points.map(p => ({ latLng: p }));

                    return new Promise<{waypoints: any[], route: any} | null>(resolve => {
                        // @ts-ignore
                        router.route(routeWaypoints, (err: any, routes: any[]) => {
                            if (!err && routes && routes.length > 0 && routes[0] && routes[0].coordinates) {
                                // We resolve with the points used (LatLng[]) as that's what setWaypoints consumes later
                                resolve({ waypoints: points, route: routes[0] });
                            } else {
                                resolve(null);
                            }
                        });
                    });
                });

                const results = await Promise.all(promises);
                
                let bestCandidate: {waypoints: any[], route: any} | null = null;
                let bestScore = Infinity;

                // Track best exposure for fallback
                let bestExposure = Infinity;
                let bestExposureCandidate: {waypoints: any[], route: any} | null = null;

                for (const res of results) {
                    if (!res) continue;

                    const metrics = calculateRouteScore(res.route, stations, vehicleType);
                    
                    // Acceptance Logic:
                    // 1. Must reduce flood exposure significantly OR be completely clear
                    // 2. Distance penalty shouldn't be insane unless flood is totally avoided
                    
                    const isFloodFree = metrics.exposure < 50; // Tolerable small exposure
                    const distIncrease = (metrics.distance - baseMetrics.distance) / (baseMetrics.distance || 1);
                    const floodReduction = baseMetrics.exposure - metrics.exposure;

                    // Save candidate with lowest exposure for fallback
                    if (metrics.exposure < bestExposure) {
                        bestExposure = metrics.exposure;
                        bestExposureCandidate = res;
                    }
                    
                    let isAcceptable = false;

                    if (isFloodFree) {
                         // If it clears the flood, we accept up to 70% more distance (Relaxed from 0.5)
                         if (distIncrease < 0.7) isAcceptable = true;
                    } else {
                         // If it doesn't clear flood, it must reduce it significantly (>30% reduction)
                         // AND not add too much distance (<40%)
                         if (floodReduction > baseMetrics.exposure * 0.3 && distIncrease < 0.4) {
                             isAcceptable = true;
                         }
                    }

                    // Always prefer score (which weights flood heavily)
                    if (isAcceptable && metrics.score < bestScore) {
                        bestScore = metrics.score;
                        bestCandidate = res;
                    }
                }

                // If no "acceptable" smart candidate, use route with lowest exposure (best effort)
                if (!bestCandidate && bestExposureCandidate) {
                     console.log("Using best-exposure fallback detour.");
                     bestCandidate = bestExposureCandidate;
                }

                // Apply Decision
                if (bestCandidate) {
                    console.log(`Detour Applied. flood=${calculateRouteScore(bestCandidate.route, stations, vehicleType).exposure}`);
                    detourAppliedRef.current = true; 
                    // Break call stack
                    setTimeout(() => {
                        if (controlRef.current) {
                            controlRef.current.setWaypoints(bestCandidate!.waypoints);
                        }
                    }, 0);
                } else {
                    console.log("No viable detour found.");
                    detourFailedRef.current = true;
                    // Trigger UI update for message
                    onRouteFound({
                        distance: route.summary.totalDistance,
                        duration: route.summary.totalTime,
                        summary: "No safe detour found. Showing original route.",
                        isFlooded: true,
                        affectedStations: affectedNames
                    });
                }

            } catch (err) {
                console.error("Error calculating detour:", err);
                detourFailedRef.current = true;
            } finally {
                isAnalyzingRef.current = false;
            }
        }
      });

      control.addTo(map);
      controlRef.current = control;
    }

    // Cleanup
    return () => {
      if (map) {
          if (controlRef.current) {
            try {
                map.removeControl(controlRef.current);
            } catch (e) {
                console.warn("Error removing routing control:", e);
            }
            controlRef.current = null;
          }
          if (dangerLayerRef.current) {
            try {
                if (map.hasLayer(dangerLayerRef.current)) {
                    map.removeLayer(dangerLayerRef.current);
                }
            } catch (e) {
                console.warn("Error removing danger layer:", e);
            }
            dangerLayerRef.current = null;
          }
      }
    };
  }, [map]);

  // 1. Destination/Start Changed
  useEffect(() => {
      if (controlRef.current) {
          const currentWps = controlRef.current.getWaypoints();
          const wStart = currentWps[0]?.latLng;
          const wEnd = currentWps[currentWps.length - 1]?.latLng;
          
          // Simple check if start/end latlngs differ
          const startChanged = !wStart || wStart.lat !== start[0] || wStart.lng !== start[1];
          const endChanged = !wEnd || wEnd.lat !== end[0] || wEnd.lng !== end[1];

          if (startChanged || endChanged) {
              detourAppliedRef.current = false; 
              detourFailedRef.current = false;
              isAnalyzingRef.current = false;
              controlRef.current.setWaypoints([
                  L.latLng(start[0], start[1]),
                  L.latLng(end[0], end[1])
              ]);
          }
      }
  }, [start, end]);

  // 2. Toggle Mode
  useEffect(() => {
      if (controlRef.current) {
          if (!avoidFloodMode) {
              // If turning OFF, and we have a detour, reset to straight line
              if (detourAppliedRef.current) {
                  detourAppliedRef.current = false;
                  detourFailedRef.current = false;
                  controlRef.current.setWaypoints([
                      L.latLng(start[0], start[1]),
                      L.latLng(end[0], end[1])
                  ]);
              }
              // Also clear fail state so we can try again if turned back on
              detourFailedRef.current = false;
          } else {
              // If turning ON, and we haven't tried yet, force route check
              if (!detourAppliedRef.current && !detourFailedRef.current) {
                  controlRef.current.route();
              }
          }
      }
  }, [avoidFloodMode]);

  // 3. Live Data Updates
  useEffect(() => {
     if (controlRef.current) {
         // Refresh route to update red lines or detect new floods
         controlRef.current.route();
     }
  }, [stations]);

  return null;
};

interface MapComponentProps {
  stations: Station[];
  onStationSelect: (station: Station) => void;
  selectedStationId?: string;
  userLocation: [number, number] | null;
  destination: [number, number] | null;
  onSetDestination: (latlng: [number, number]) => void;
  isNavigating: boolean;
  onRouteFound: (info: RouteInfo) => void;
  avoidFloodMode: boolean;
  vehicleType: VehicleType;
}

const MapComponent: React.FC<MapComponentProps> = ({
  stations,
  onStationSelect,
  selectedStationId,
  userLocation,
  destination,
  onSetDestination,
  isNavigating,
  onRouteFound,
  avoidFloodMode,
  vehicleType
}) => {
  return (
    <MapContainer 
      center={MAP_CENTER_HANOI} 
      zoom={DEFAULT_ZOOM} 
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController center={userLocation || (selectedStationId ? null : undefined)} />
      
      <MapClickHandler onMapClick={isNavigating ? undefined : onSetDestination} />

      {/* User Location Marker */}
      {userLocation && (
        <Marker position={userLocation} icon={
          new DivIcon({
            className: 'bg-transparent',
            html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`
          })
        }>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker position={destination} icon={
          new DivIcon({
            className: 'bg-transparent',
            html: `<div class="text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }>
          <Popup>Destination</Popup>
        </Marker>
      )}

      {/* Stations */}
      {stations.map(station => {
        // Determine animation class based on status
        let animationClass = '';
        if (station.status === Status.DANGER) {
          animationClass = 'marker-danger';
        } else if (station.status === Status.WARNING) {
          animationClass = 'marker-warning';
        }

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            eventHandlers={{
              click: () => onStationSelect(station),
            }}
            icon={new DivIcon({
              className: 'bg-transparent',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${animationClass}" style="background-color: ${STATUS_COLORS[station.status]}"></div>
                  ${selectedStationId === station.id ? '<div class="absolute -inset-2 border-2 border-blue-500 rounded-full animate-pulse"></div>' : ''}
                </div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold text-sm">{station.name}</h3>
                <p className="text-xs text-slate-500">Level: {station.currentLevel}cm</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Routing */}
      {isNavigating && userLocation && destination && (
        <RoutingMachine
          start={userLocation}
          end={destination}
          stations={stations}
          onRouteFound={onRouteFound}
          avoidFloodMode={avoidFloodMode}
          vehicleType={vehicleType}
        />
      )}
    </MapContainer>
  );
};

export default MapComponent;
