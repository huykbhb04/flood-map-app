
export enum Status {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  DANGER = 'DANGER'
}

export enum VehicleType {
  MOTORBIKE = 'MOTORBIKE',
  CAR = 'CAR'
}

export interface WaterLevelLog {
  timestamp: string;
  level: number;
}

// --- Weather API Types ---
export interface WeatherForecastPoint {
  time: number;
  temperature: number;
  humidity: number;
  status: string;
}

// Matches the structure: predict: { current_status, forecast[] }
export interface WeatherPredict {
  current_status: string;
  forecast: WeatherForecastPoint[];
}

export interface WeatherStation {
  id: number;
  station_id: number;
  station: string;
  coords: {
    lat: number;
    lng: number;
  };
  temperature: number;
  humidity: number;
  pressure: number;
  lux: number;
  created_at: string;
  predict: WeatherPredict;
  
  // UI Flag to indicate data source (Live vs Simulation)
  isMock?: boolean; 
}

export interface WeatherStationData {
  stations: WeatherStation[];
  isMock: boolean;
}
// -------------------------

export interface Station {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  currentLevel: number; // cm
  threshold: number; // cm
  status: Status;
  lastUpdated: string;
  history: WaterLevelLog[];
  isAutoWarning: boolean;
  blynkToken?: string;
  
  // Linked Weather Data
  weatherData?: WeatherStation | null;
  distanceToWeatherStation?: number; // km
}

export interface DashboardStats {
  activeNodes: number;
  safeZones: number;
  warnings: number;
  criticalDanger: number;
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  summary: string;
  isFlooded: boolean;
  isDetour?: boolean;
  affectedStations: string[];
}

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}
