
import { WeatherStation, WeatherStationData } from '../types';

// Ưu tiên đọc từ biến môi trường, fallback sang URL ngrok hiện tại
const WEATHER_API_URL: string =
  (import.meta as any).env?.VITE_WEATHER_API ||
  'https://idiocratic-unpredicting-kim.ngrok-free.dev/api/weather';

const MATCHING_RADIUS_KM = 5;

// --- MOCK DATA FOR FALLBACK (Simulation) ---
const MOCK_STATIONS_LIST: WeatherStation[] = [
  {
    id: 60587,
    station_id: 1,
    station: 'Hà Đông (Simulation)',
    coords: { lat: 20.971164, lng: 105.778194 },
    temperature: 25.65,
    humidity: 49.24,
    pressure: 1036.67,
    lux: 78,
    created_at: new Date().toISOString(),
    predict: {
      current_status: 'Nhiều mây',
      forecast: [
        { time: 30, temperature: 25.8, humidity: 50.5, status: 'Nhiều mây' },
        { time: 60, temperature: 25.5, humidity: 49.6, status: 'Nhiều mây' },
        { time: 90, temperature: 24.8, humidity: 50.1, status: 'Nhiều mây' },
        { time: 120, temperature: 25.0, humidity: 52.4, status: 'Nhiều mây' },
        { time: 150, temperature: 25.6, humidity: 50.7, status: 'Nhiều mây' },
        { time: 180, temperature: 25.6, humidity: 54.2, status: 'Nhiều mây' }
      ]
    }
  },
  {
    id: 60588,
    station_id: 2,
    station: 'Nam Từ Liêm (Simulation)',
    coords: { lat: 21.035105, lng: 105.745162 },
    temperature: 25.1,
    humidity: 60.36,
    pressure: 1030.31,
    lux: 3,
    created_at: new Date().toISOString(),
    predict: {
      current_status: 'Mưa nhẹ',
      forecast: [
        { time: 30, temperature: 25.1, humidity: 62.6, status: 'Mưa nhẹ' },
        { time: 60, temperature: 24.8, humidity: 65.1, status: 'Mưa rào' },
        { time: 90, temperature: 24.5, humidity: 68.2, status: 'Mưa rào' },
        { time: 120, temperature: 24.2, humidity: 70.9, status: 'Mưa' },
        { time: 150, temperature: 24.0, humidity: 72.7, status: 'Mưa' },
        { time: 180, temperature: 23.8, humidity: 75.2, status: 'Mưa' }
      ]
    }
  }
];

// Helper: Haversine Distance
const deg2rad = (deg: number): number => deg * (Math.PI / 180);

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Fetches weather data from the Proxy API.
 * Fail-Safe: Returns Mock data if API fails.
 */
export const fetchWeatherData = async (): Promise<WeatherStationData> => {
  try {
    console.log('[Weather] Fetching from:', WEATHER_API_URL);

    // Dùng AbortController để timeout nếu mạng treo
    let controller: AbortController | null = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
    }

    const timeoutId =
      controller != null
        ? setTimeout(() => controller!.abort(), 8000)
        : null;

    const response = await fetch(WEATHER_API_URL, {
      method: 'GET',
      headers: {
        // Quan trọng: Header này giúp vượt qua màn hình "Visit Site" của ngrok free tier
        'ngrok-skip-browser-warning': 'true', 
        'Accept': 'application/json'
      },
      signal: controller?.signal
    } as RequestInit);

    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Đọc dưới dạng text trước để kiểm tra xem có phải HTML (lỗi ngrok) không
    const textData = await response.text();
    
    // Nếu bắt đầu bằng < (ví dụ <!DOCTYPE html...), nghĩa là nhận được HTML thay vì JSON
    if (textData.trim().startsWith('<')) {
      console.warn('[Weather] Received HTML response instead of JSON (likely ngrok interstitial or error page).');
      throw new Error('Response is HTML, not JSON');
    }

    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      throw new Error('JSON Parse Error: Invalid format');
    }

    console.log('[Weather] Parsed response:', data);

    // Proxy format: { isMock: boolean, stations: [...] }
    if (data && Array.isArray(data.stations)) {
      return {
        stations: data.stations,
        isMock: typeof data.isMock === 'boolean' ? data.isMock : false
      };
    }

    // Legacy format support: raw array
    if (Array.isArray(data)) {
      return {
        stations: data,
        isMock: false
      };
    }

    throw new Error('Invalid weather data structure');
  } catch (error) {
    console.warn(
      'Weather API unreachable or returned invalid data — switching to Simulation Mode.',
      error
    );

    // Fallback to mock data seamlessly
    return {
      stations: MOCK_STATIONS_LIST,
      isMock: true
    };
  }
};

/**
 * Finds the nearest weather station within MATCHING_RADIUS_KM radius
 */
export const findNearestWeatherStation = (
  nodeLat: number,
  nodeLng: number,
  weatherStations: WeatherStation[]
): { data: WeatherStation | null; distance: number } => {
  let nearest: WeatherStation | null = null;
  let minDistance = Infinity;

  for (const ws of weatherStations) {
    if (!ws.coords) continue;
    const dist = calculateDistance(
      nodeLat,
      nodeLng,
      ws.coords.lat,
      ws.coords.lng
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = ws;
    }
  }

  if (minDistance <= MATCHING_RADIUS_KM && nearest) {
    return { data: nearest, distance: minDistance };
  }

  return { data: null, distance: -1 };
};
