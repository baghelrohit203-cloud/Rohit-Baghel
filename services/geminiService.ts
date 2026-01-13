
import { GoogleGenAI, Type } from "@google/genai";
import { ActivityEntry } from "../types";
import { BLOCKS } from "../constants";

export async function getProductivityAnalysis(activities: ActivityEntry[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = activities.map(a => {
    const block = BLOCKS.find(b => b.id === a.blockId);
    const statusText = a.status === 'Completed' ? '✅' : (a.status === 'Rescheduled' ? '⏭️' : '⏳');
    return `Block ${block?.label} (${block?.startTime}-${block?.endTime}): ${a.type} - ${a.description} (${a.estimatedDuration}m) [${statusText} ${a.status}]`;
  }).join('\n');

  const prompt = `
    As "Karam-Charak", a high-performance productivity philosopher and coach, analyze my "6x4" (six 4-hour cycles) day structure:
    
    ${summary || "No activities logged today."}
    
    Provide a professional, stoic, and insightful analysis in Markdown. Focus on:
    1. Completion rate vs Rescheduling patterns.
    2. Alignment of difficult tasks (Work/Study) with prime cycles.
    3. Three specific, actionable "Karam" (actions) to optimize tomorrow.
    
    Keep the tone minimalist, grounded, and focused on self-mastery.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Karam-Charak intelligence is currently offline.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the Karam-Charak wisdom core.";
  }
}
