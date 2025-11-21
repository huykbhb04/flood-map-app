
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { DivIcon, LatLngExpression, LatLng } from 'leaflet';
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
  const routingControlRef = useRef<any>(null);
  const dangerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up previous control and danger layers
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        console.warn("Control removal cleanup error", e);
      }
      routingControlRef.current = null;
    }
    if (dangerLayerRef.current) {
      map.removeLayer(dangerLayerRef.current);
      dangerLayerRef.current = null;
    }

    // Create a new LayerGroup for the red segments (flooded areas)
    dangerLayerRef.current = L.layerGroup().addTo(map);

    // DETERMINE WAYPOINTS
    let waypoints = [
      L.latLng(start[0], start[1]),
      L.latLng(end[0], end[1])
    ];

    // --- SMART AVOIDANCE ALGORITHM ---
    if (avoidFloodMode) {
       // Filter stations based on Vehicle Type
       // Motorbike: Avoids WARNING & DANGER
       // Car: Avoids DANGER only (can pass small floods)
       const dangerStations = stations.filter(s => {
         if (vehicleType === VehicleType.MOTORBIKE) {
           return s.status === Status.DANGER || s.status === Status.WARNING;
         } else {
           return s.status === Status.DANGER;
         }
       });

       let stationToAvoid: Station | null = null;
       
       // Find intersection: Check if the direct path (Start -> End) passes near any danger station
       const pathCenter = L.latLng((start[0] + end[0]) / 2, (start[1] + end[1]) / 2);
       let minDist = Infinity;

       // Direct line distance (crow flies)
       const startPt = L.latLng(start[0], start[1]);
       const endPt = L.latLng(end[0], end[1]);
       const directDist = startPt.distanceTo(endPt);

       for (const s of dangerStations) {
          const stationLatLng = L.latLng(s.lat, s.lng);
          const distToCenter = stationLatLng.distanceTo(pathCenter);
          const distToStart = stationLatLng.distanceTo(startPt);
          const distToEnd = stationLatLng.distanceTo(endPt);

          // Heuristic: Station must be roughly between start and end (in the ellipse)
          // We check if dist(Start, S) + dist(End, S) is close to dist(Start, End)
          if ((distToStart + distToEnd) < directDist * 1.5) {
             // Prioritize the station closest to the middle of the journey for the best detour
             if (distToCenter < minDist) {
               minDist = distToCenter;
               stationToAvoid = s;
             }
          }
       }

       // If a danger station is obstructing the path
       if (stationToAvoid) {
          const dangerPt = L.latLng(stationToAvoid.lat, stationToAvoid.lng);

          // VECTOR MATH FOR INTELLIGENT DETOUR
          // Calculate the direction vector from Start to End
          const dLat = endPt.lat - startPt.lat;
          const dLng = endPt.lng - startPt.lng;
          const len = Math.sqrt(dLat*dLat + dLng*dLng);
          
          // Normalized Perpendicular Vector (-dLng, dLat) -> This rotates 90 deg counter-clockwise
          const perpLat = -dLng / len;
          const perpLng = dLat / len;

          // Determine which side the danger point is relative to the path
          // Cross Product: (B.x - A.x)*(C.y - A.y) - (B.y - A.y)*(C.x - A.x)
          // If > 0, C is Left. If < 0, C is Right.
          const cp = (endPt.lng - startPt.lng) * (dangerPt.lat - startPt.lat) - (endPt.lat - startPt.lat) * (dangerPt.lng - startPt.lng);
          
          // Offset distance: ~1.5km (0.015 degrees)
          const offset = 0.015;
          
          // If Danger is Left (cp > 0), we detour Right (subtract perpendicular vector)
          // If Danger is Right (cp < 0), we detour Left (add perpendicular vector)
          const direction = cp > 0 ? -1 : 1;

          const detourLat = dangerPt.lat + (perpLat * offset * direction);
          const detourLng = dangerPt.lng + (perpLng * offset * direction);
          
          const detourPt = L.latLng(detourLat, detourLng);

          // Insert the "Via Point" to force OSRM to go around
          waypoints = [
             startPt,
             detourPt, 
             endPt
          ];
       }
    }

    // Create new routing control
    const control = L.Routing.control({
      waypoints: waypoints,
      lineOptions: {
        // BASE STYLE: Always Blue (#3b82f6) for the "Safe" parts
        styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }],
        extendToWaypoints: false,
        missingRouteTolerance: 0
      },
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: function() { return null; } // Hide default markers
    } as any);

    control.on('routesfound', function(e: any) {
      const routes = e.routes;
      const route = routes[0];
      const coordinates = route.coordinates; 
      
      // FLOOD SEGMENTATION LOGIC (Traffic Style)
      let isFloodedRoute = false;
      const affectedStations: string[] = [];
      
      const dangerSegments: LatLng[][] = [];
      let currentSegment: LatLng[] = [];

      // 500m radius = 1km danger zone affected by sensor
      const DANGER_RADIUS_METERS = 500; 

      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        const point = L.latLng(coord.lat, coord.lng);
        let isPointDangerous = false;

        // Check against all stations to mark Red Zones
        for (const station of stations) {
           // Determine if station is dangerous for the selected vehicle
           let isStationRisky = false;
           if (vehicleType === VehicleType.MOTORBIKE) {
             isStationRisky = (station.status === Status.DANGER || station.status === Status.WARNING);
           } else {
             isStationRisky = (station.status === Status.DANGER);
           }

           if (isStationRisky) {
             const stationLatLng = L.latLng(station.lat, station.lng);
             const distance = point.distanceTo(stationLatLng);
             
             if (distance < DANGER_RADIUS_METERS) {
               isPointDangerous = true;
               isFloodedRoute = true;
               if (!affectedStations.includes(station.name)) {
                 affectedStations.push(station.name);
               }
               break; 
             }
           }
        }

        if (isPointDangerous) {
          currentSegment.push(point);
        } else {
          // Transition from Danger to Safe
          if (currentSegment.length > 0) {
            // Add one more point to close the visual gap
            currentSegment.push(point); 
            dangerSegments.push([...currentSegment]);
            currentSegment = [];
          }
        }
      }

      // Handle case where route ends in a danger zone
      if (currentSegment.length > 0) {
        dangerSegments.push(currentSegment);
      }

      // DRAW RED OVERLAYS (Traffic Style)
      if (dangerLayerRef.current) {
        dangerLayerRef.current.clearLayers();
        dangerSegments.forEach(segment => {
          L.polyline(segment, {
            color: '#ef4444', // Red for flood
            weight: 7,        // Thicker than base line to overlay clearly
            opacity: 1,
          }).addTo(dangerLayerRef.current!);
        });
      }

      onRouteFound({
        distance: route.summary.totalDistance,
        duration: route.summary.totalTime,
        summary: route.name,
        isFlooded: isFloodedRoute,
        affectedStations
      });
    });

    control.addTo(map);
    routingControlRef.current = control;

    return () => {
      // Cleanup function
      if (map && routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {
           // Leaflet routing machine sometimes throws if map is already destroyed
        }
      }
      if (map && dangerLayerRef.current) {
        map.removeLayer(dangerLayerRef.current);
      }
    };
  }, [map, start, end, stations, avoidFloodMode, vehicleType]); 

  return null;
};


// --- Marker Helpers ---

const getMarkerHtml = (status: Status) => {
  const color = STATUS_COLORS[status];
  let animationClass = '';
  
  if (status === Status.DANGER) {
    animationClass = 'marker-danger';
  } else if (status === Status.WARNING) {
    animationClass = 'marker-warning';
  }

  return `
    <div class="${animationClass}" style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <div style="background: white; width: 6px; height: 6px; border-radius: 50%;"></div>
    </div>
  `;
};

const getUserMarkerIcon = (vehicleType: VehicleType) => {
  const iconChar = vehicleType === VehicleType.CAR ? '🚗' : '🛵';
  return new DivIcon({
    className: 'custom-user-marker',
    html: `<div class="marker-user flex items-center justify-center text-[10px]">${iconChar}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const getDestinationIcon = () => {
  return new DivIcon({
    className: 'custom-dest-marker',
    html: `<div style="font-size: 24px;">🏁</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

// --- Main Component ---

interface Props {
  stations: Station[];
  onStationSelect: (station: Station) => void;
  selectedStationId?: string;
  userLocation: [number, number] | null;
  destination: [number, number] | null;
  onSetDestination: (latlng: [number, number]) => void;
  isNavigating: boolean;
  onRouteFound: (info: RouteInfo) => void;
  avoidFloodMode?: boolean;
  vehicleType?: VehicleType;
}

const MapComponent: React.FC<Props> = ({ 
  stations, 
  onStationSelect, 
  selectedStationId, 
  userLocation,
  destination,
  onSetDestination,
  isNavigating,
  onRouteFound,
  avoidFloodMode = false,
  vehicleType = VehicleType.MOTORBIKE
}) => {
  return (
    <MapContainer 
      center={MAP_CENTER_HANOI as LatLngExpression} 
      zoom={DEFAULT_ZOOM} 
      className="h-full w-full rounded-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController center={userLocation} />
      
      <MapClickHandler onMapClick={isNavigating ? onSetDestination : undefined} />

      {/* User Location Marker */}
      {userLocation && (
        <Marker 
          position={userLocation}
          icon={getUserMarkerIcon(vehicleType)}
        >
           <Popup>
            <div className="text-slate-900 text-xs font-bold">
              Your Location ({vehicleType === VehicleType.CAR ? 'Car' : 'Motorbike'})
            </div>
           </Popup>
        </Marker>
      )}
      
      {/* Destination Marker */}
      {destination && isNavigating && (
        <Marker position={destination} icon={getDestinationIcon()}>
          <Popup>Destination</Popup>
        </Marker>
      )}

      {/* Routing Logic */}
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
      
      {/* Stations */}
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          eventHandlers={{
            click: () => onStationSelect(station),
          }}
          icon={new DivIcon({
            className: 'custom-marker-container',
            html: getMarkerHtml(station.status),
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })}
        >
          <Popup className="custom-popup">
            <div className="text-slate-900 p-1">
              <h3 className="font-bold text-sm">{station.name}</h3>
              <div className="text-xs mt-1 flex justify-between items-center">
                <span>Level: <strong>{station.currentLevel}cm</strong></span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] text-white font-bold bg-${station.status === Status.DANGER ? 'red' : station.status === Status.WARNING ? 'amber' : 'emerald'}-500`}>
                  {station.status}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
