import { z } from "zod";

// Node Types
export type NodeType = "text" | "image" | "llm";

// LLM Request Schema
export const LLMExecuteSchema = z.object({
  model: z.enum([
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ]).default("gemini-2.5-flash"),
  systemPrompt: z.string().optional(),
  userMessage: z.string().min(1, "User message is required"),
  images: z.array(z.string()).optional(), // base64 encoded strings (without data URI prefix) or Cloudinary URLs
});

export type LLMExecuteRequest = z.infer<typeof LLMExecuteSchema>;

// LLM Response
export interface LLMResponse {
  success: boolean;
  data?: {
    text: string;
    model: string;
  };
  error?: string;
}

// Workflow Schema
export const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Workflow name is required"),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Image Upload Response
export interface ImageUploadResponse {
  success: boolean;
  data?: {
    url: string;
    publicId: string;
  };
  error?: string;
}

