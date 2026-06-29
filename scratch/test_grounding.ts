import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key found.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function test() {
  console.log("Testing Google Search Grounding for Black Crown Coffee...");
  const prompt = `Provide the actual weekly operating hours for "Black Crown Coffee Co." in Tucson, AZ.
Return JSON:
{
  "name": "Black Crown Coffee",
  "hours": {
    "Monday": "string",
    "Tuesday": "string",
    "Wednesday": "string",
    "Thursday": "string",
    "Friday": "string",
    "Saturday": "string",
    "Sunday": "string"
  }
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Google Search Grounding
      }
    });

    console.log("Response text:", response.text);
    const text = response.text || '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/) || [null, text];
    const jsonText = (jsonMatch[1] || text).trim();
    console.log("Parsed JSON Text:", jsonText);
    console.log("Parsed JSON Object:", JSON.parse(jsonText));
  } catch (err: any) {
    console.error("Error running test:", err.message || err);
  }
}

test();
