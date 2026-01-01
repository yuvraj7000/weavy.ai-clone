import { GoogleGenAI } from "@google/genai";
import { LLMExecuteRequest, LLMResponse } from "./types";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    // GoogleGenAI automatically reads from GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY env var
    genAI = new GoogleGenAI({});
  }
  return genAI;
}

/**
 * List all available Gemini models
 */
export async function listAvailableModels(): Promise<string[]> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API key not found");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];
    
    // Filter and format model names
    const modelNames = models
      .map((model: { name: string }) => {
        // Model names come as "models/gemini-1.5-flash", extract just the name
        const name = model.name.replace('models/', '');
        return name;
      })
      .filter((name: string) => name.startsWith('gemini'))
      .sort();

    return modelNames;
  } catch (error) {
    console.error("Error listing models:", error);
    throw error;
  }
}

/**
 * Detect MIME type from base64 image data
 */
function detectImageMimeType(imageBase64: string): string {
  // Remove data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  if (base64Data.startsWith('/9j/')) return 'image/jpeg';
  if (base64Data.startsWith('iVBORw')) return 'image/png';
  if (base64Data.startsWith('R0lGOD')) return 'image/gif';
  if (base64Data.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

// Convert base64 or URL to Part format for Gemini
function prepareImagePart(imageData: string): { inlineData: { data: string; mimeType: string } } {
  // Remove data URI prefix if present
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  return {
    inlineData: {
      data: base64Data,
      mimeType: detectImageMimeType(imageData),
    },
  };
}

// Fetch image from URL and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

export async function executeLLM(
  request: LLMExecuteRequest
): Promise<LLMResponse> {
  try {
    const ai = getGenAI();
    
    // Build contents - can be string or array of parts
    let contents: string | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;

    // If we have images, use array format
    if (request.images && request.images.length > 0) {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add system prompt if provided
      if (request.systemPrompt) {
        parts.push({ text: `System Instructions: ${request.systemPrompt}\n\n` });
      }

      // Add user message
      parts.push({ text: request.userMessage });

      // Add images
      for (const image of request.images) {
        let imageBase64: string;
        
        // If it's a URL (Cloudinary), fetch it first
        if (image.startsWith("http://") || image.startsWith("https://")) {
          imageBase64 = await fetchImageAsBase64(image);
        } else {
          // If it's already base64, use it directly
          imageBase64 = image;
        }
        
        const imagePart = prepareImagePart(imageBase64);
        parts.push(imagePart);
      }

      contents = parts;
    } else {
      // Simple text-only request - can use string format
      let textContent = request.userMessage;
      if (request.systemPrompt) {
        textContent = `System Instructions: ${request.systemPrompt}\n\n${request.userMessage}`;
      }
      contents = textContent;
    }

    // Generate content using new API pattern
    const response = await ai.models.generateContent({
      model: request.model,
      contents: contents,
    });

    const responseText = response.text || '';
    
    if (!responseText) {
      throw new Error("No response text received from Gemini API");
    }

    return {
      success: true,
      data: {
        text: responseText,
        model: request.model,
      },
    };
  } catch (error: unknown) {
    console.error("Gemini API error:", error);
    
    let errorMessage = "Failed to execute LLM request";
    
    if (error instanceof Error) {
      // Check for model not found errors - suggest using a different model
      if (error.message.includes('not found') || error.message.includes('404')) {
        errorMessage = `Model "${request.model}" is not available. Try using "gemini-2.5-flash" or "gemini-2.0-flash" instead. Original error: ${error.message}`;
      }
      // Check for quota/rate limit errors
      else if (error.message.includes('quota') || error.message.includes('rate')) {
        errorMessage = 'API quota exceeded. Please try again later or check your API key limits.';
      }
      // Check for invalid API key
      else if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY.';
      }
      else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}
