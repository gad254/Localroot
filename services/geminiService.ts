import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// Initialize the Gemini API client
// Ideally this key comes from process.env.API_KEY, but for this demo, we assume it's injected
const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is not set. Gemini features will likely fail.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `As a professional food copywriter, write a compelling, appetizing description for a local farm product.
      Product Name: ${productName}
      Category: ${category}
      Requirements:
      - Highlight freshness and local quality
      - Keep it under 40 words
      - Tone: Rustic, artisanal, and inviting
      - No hashtags or emojis`,
    });
    return response.text?.trim() || "Fresh, locally sourced produce straight from our farm to your table.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Fresh, locally sourced produce straight from our farm to your table.";
  }
};

export const suggestRecipe = async (ingredients: string): Promise<any> => {
  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Suggest one simple recipe I can make using some of these ingredients: ${ingredients}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.STRING }
          },
          required: ["title", "ingredients", "instructions"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const smartSearch = async (query: string): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User is searching for: "${query}". 
      Return a JSON array of 3-5 standard food product categories or keywords that would match this request. 
      Example: "I want to make a salad" -> ["Lettuce", "Tomato", "Cucumber", "Spinach"].
      Only return the JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Smart Search Error", error);
    return [query];
  }
};