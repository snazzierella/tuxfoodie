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
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            hours: {
              type: 'OBJECT',
              properties: {
                Monday: { type: 'STRING' },
                Tuesday: { type: 'STRING' },
                Wednesday: { type: 'STRING' },
                Thursday: { type: 'STRING' },
                Friday: { type: 'STRING' },
                Saturday: { type: 'STRING' },
                Sunday: { type: 'STRING' }
              },
              required: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            }
          },
          required: ['name', 'hours']
        },
        tools: [{ googleSearch: {} }] // Google Search Grounding
      }
    });

    console.log("Response text:", response.text);
  } catch (err: any) {
    console.error("Error running test:", err.message || err);
  }
}

test();
