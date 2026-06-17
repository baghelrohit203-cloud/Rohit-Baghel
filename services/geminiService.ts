
import { GoogleGenAI } from "@google/genai";
import { ActivityEntry } from "../types";

export async function getProductivityAnalysis(activities: ActivityEntry[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = activities.map(a => {
    const statusText = a.status === 'Completed' ? '✅' : (a.status === 'Rescheduled' ? '⏭️' : '⏳');
    const distractionText = a.distractions && a.distractions.length > 0 ? ` [Distractions: ${a.distractions.join(', ')}]` : '';
    return `${a.group}: ${a.description} (${a.estimatedDuration}m) [${statusText} ${a.status}]${distractionText}`;
  }).join('\n');

  const prompt = `
    As a high-performance productivity coach for a banking exam aspirant, analyze my daily activities:
    
    ${summary || "No activities logged today."}
    
    Provide a professional, motivating, and insightful analysis in Markdown. Focus on:
    1. Balance between Daily Maintenance, Office Work, and Target Work (Exam Prep).
    2. Impact of distractions on productivity.
    3. Three specific, actionable steps to improve focus and goal alignment tomorrow.
    
    Keep the tone encouraging yet disciplined.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Productivity intelligence is currently offline.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the coaching core.";
  }
}
