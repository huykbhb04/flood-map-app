
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

export interface Station {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  currentLevel: number; // cm
  threshold: number; // cm (User defined V1)
  status: Status;
  lastUpdated: string;
  history: WaterLevelLog[];
  isAutoWarning: boolean; // V2
  blynkToken?: string; // Integration with Blynk
}

export interface DashboardStats {
  activeNodes: number;
  safeZones: number;
  warnings: number;
  criticalDanger: number;
}

export interface GeminiAnalysisResult {
  riskLevel: string;
  summary: string;
  recommendations: string[];
  timestamp: string;
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  summary: string;
  isFlooded: boolean;
  affectedStations: string[];
}

export interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}