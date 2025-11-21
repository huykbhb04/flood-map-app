import { GoogleGenAI } from "@google/genai";
import { Station } from '../types';

export const analyzeFloodRisk = async (station: Station): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API Key not configured. Please set the API_KEY environment variable.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are an AI Risk Analyst for an IoT Flood Monitoring System.
      
      Analyze the following sensor data for a specific monitoring station:
      
      **Station ID:** ${station.id}
      **Location:** ${station.name}, ${station.location}
      **Current Water Level:** ${station.currentLevel} cm
      **Safety Threshold:** ${station.threshold} cm
      **Auto-Warning System:** ${station.isAutoWarning ? "ENABLED" : "DISABLED"}
      **Recent Trend (Last 30 mins):** ${JSON.stringify(station.history.slice(-5))}
      
      **Instructions:**
      1. Assess the current risk level (Safe, Warning, or Critical).
      2. Analyze the trend (rising quickly, stable, receding).
      3. Provide 3 actionable recommendations for local authorities or residents.
      4. Keep the tone professional, urgent if danger is high, and concise.
      5. Format the output in clear Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis completed but no text returned.";
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return "System Error: Unable to generate risk analysis at this time. Please check connection or API quota.";
  }
};