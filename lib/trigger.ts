import { configure } from "@trigger.dev/sdk/v3";

// Configure Trigger.dev SDK FIRST before importing tasks
// The SDK needs to be configured before tasks are imported
const secretKey = process.env.TRIGGER_SECRET_KEY;
if (!secretKey) {
  console.warn("TRIGGER_SECRET_KEY not set. Trigger.dev tasks will not work.");
} else {
  configure({
    secretKey: secretKey,
  });
}

// Import tasks AFTER configuration
import { executeLLMTask } from "@/src/trigger/llm.task";
import { cropImageTask } from "@/src/trigger/cropImage.task";
import { extractFrameTask } from "@/src/trigger/extractFrame.task";

export async function triggerLLMTask(
  payload: {
    model: string;
    systemPrompt?: string;
    userMessage: string;
    images?: string[];
  }
) {
  // Ensure SDK is configured
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY environment variable is not set. Please add it to your .env.local file.");
  }

  // Trigger the task directly using task.trigger()
  // Type assertion needed because payload model is string but task expects enum
  const handle = await executeLLMTask.trigger({
    ...payload,
    model: payload.model as "gemini-2.5-flash" | "gemini-2.5-flash-lite",
  });
  return handle;
}

export async function triggerCropImageTask(
  payload: {
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }
) {
  // Ensure SDK is configured
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY environment variable is not set. Please add it to your .env.local file.");
  }

  // Trigger the task directly using task.trigger()
  const handle = await cropImageTask.trigger(payload);
  return handle;
}

export async function triggerExtractFrameTask(
  payload: {
    videoUrl: string;
    timestamp: string;
  }
) {
  // Ensure SDK is configured
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error("TRIGGER_SECRET_KEY environment variable is not set. Please add it to your .env.local file.");
  }

  // Trigger the task directly using task.trigger()
  const handle = await extractFrameTask.trigger(payload);
  return handle;
}
