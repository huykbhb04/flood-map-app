
export interface GeocodingResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

export const searchAddress = async (query: string): Promise<GeocodingResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    // Using OpenStreetMap Nominatim API (Free, requires no key for low usage)
    // Bounding box focused roughly on Vietnam/Hanoi to prioritize local results
    const viewbox = '102.1,8.1,109.5,23.4'; 
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=5`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8' // Prioritize Vietnamese
      }
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};
