import { NextRequest, NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/gemini";

export async function GET(request: NextRequest) {
  try {
    const models = await listAvailableModels();
    
    console.log("=".repeat(60));
    console.log("📋 Available Gemini Models:");
    console.log("=".repeat(60));
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model}`);
    });
    console.log("=".repeat(60));
    console.log(`Total: ${models.length} models available`);
    console.log("=".repeat(60));
    
    return NextResponse.json({
      success: true,
      data: {
        models,
        count: models.length,
      },
    });
  } catch (error: unknown) {
    console.error("Error listing models:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list models";
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

