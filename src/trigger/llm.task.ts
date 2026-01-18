import { logger, task } from "@trigger.dev/sdk/v3";
import { GoogleGenAI } from "@google/genai";
import { LLMExecuteRequest } from "@/lib/types";

// Helper functions
function detectImageMimeType(imageBase64: string): string {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  if (base64Data.startsWith('/9j/')) return 'image/jpeg';
  if (base64Data.startsWith('iVBORw')) return 'image/png';
  if (base64Data.startsWith('R0lGOD')) return 'image/gif';
  if (base64Data.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

function prepareImagePart(imageData: string): { inlineData: { data: string; mimeType: string } } {
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  return {
    inlineData: {
      data: base64Data,
      mimeType: detectImageMimeType(imageData),
    },
  };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

interface LLMTaskPayload {
  model: string; // Allow any string for flexibility
  systemPrompt?: string;
  userMessage: string;
  images?: string[];
}

export const executeLLMTask = task({
  id: "execute-llm",
  maxDuration: 300, // 5 minutes max
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
  },
  run: async (payload: LLMTaskPayload) => {
    logger.log("Executing LLM task", { model: payload.model });

    try {
      // Get API key from environment variable
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable is not set");
      }

      // Initialize GoogleGenAI with explicit API key
      const ai = new GoogleGenAI({ apiKey });
      
      // Build contents
      let contents: string | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;

      if (payload.images && payload.images.length > 0) {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        if (payload.systemPrompt) {
          parts.push({ text: `System Instructions: ${payload.systemPrompt}\n\n` });
        }

        parts.push({ text: payload.userMessage });

        for (const image of payload.images) {
          let imageBase64: string;
          
          if (image.startsWith("http://") || image.startsWith("https://")) {
            imageBase64 = await fetchImageAsBase64(image);
          } else {
            imageBase64 = image;
          }
          
          const imagePart = prepareImagePart(imageBase64);
          parts.push(imagePart);
        }

        contents = parts;
      } else {
        let textContent = payload.userMessage;
        if (payload.systemPrompt) {
          textContent = `System Instructions: ${payload.systemPrompt}\n\n${payload.userMessage}`;
        }
        contents = textContent;
      }

      const response = await ai.models.generateContent({
        model: payload.model,
        contents: contents,
      });

      const responseText = response.text || '';
      
      if (!responseText) {
        throw new Error("No response text received from Gemini API");
      }

      const result = {
        success: true,
        data: {
          text: responseText,
          model: payload.model,
        },
      };

      return result;
    } catch (error: unknown) {
      logger.error("LLM task error", { error });
      
      let errorMessage = "Failed to execute LLM request";
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
          errorMessage = `Model "${payload.model}" is not available.`;
        } else if (error.message.includes('quota') || error.message.includes('rate')) {
          errorMessage = 'API quota exceeded.';
        } else if (error.message.includes('API key') || error.message.includes('authentication')) {
          errorMessage = 'Invalid API key.';
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(errorMessage);
    }
  },
});

