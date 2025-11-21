
const BLYNK_SERVER = "https://blynk.cloud/external/api";

interface BlynkData {
  currentLevel: number;
  threshold: number;
  isAutoWarning: boolean;
}

/**
 * Fetch data from Blynk pins V0, V1, V2
 * V0: Water Level
 * V1: Threshold
 * V2: Auto Warning (0 or 1)
 */
export const fetchBlynkData = async (token: string): Promise<BlynkData | null> => {
  try {
    // Using API to get multiple pins: /get?token={token}&v0&v1&v2
    // Note: The response format for multiple pins depends on the specific Blynk cloud version,
    // but typically it returns a JSON object like {"v0": "value", "v1": "value"} 
    // or we fetch them individually if batch is not supported cleanly in all contexts.
    // For safety and CORS reasons, individual fetches are sometimes more reliable in simple CORS proxies,
    // but let's try the batch get first. If we receive a JSON object, great.
    
    const response = await fetch(`${BLYNK_SERVER}/get?token=${token}&v0&v1&v2`);
    
    if (!response.ok) {
      console.warn(`Blynk fetch failed: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Blynk API returns strings for values usually
    return {
      currentLevel: parseFloat(data.v0 || 0),
      threshold: parseFloat(data.v1 || 0),
      isAutoWarning: parseInt(data.v2 || 0) === 1
    };
  } catch (error) {
    console.error("Error fetching Blynk data:", error);
    return null;
  }
};

/**
 * Update a specific pin on Blynk
 */
export const updateBlynkPin = async (token: string, pin: string, value: string | number): Promise<boolean> => {
  try {
    const response = await fetch(`${BLYNK_SERVER}/update?token=${token}&${pin}=${value}`);
    return response.ok;
  } catch (error) {
    console.error(`Error updating Blynk pin ${pin}:`, error);
    return false;
  }
};
