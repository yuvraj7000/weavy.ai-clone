import { NextRequest, NextResponse } from "next/server";
import { executeLLM } from "@/lib/gemini";
import { LLMExecuteSchema } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request with Zod
    const validationResult = LLMExecuteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Execute LLM request
    const result = await executeLLM(validatedData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to execute LLM request",
        },
        { status: 500 }
      );
    }
    console.log("result", result);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("LLM API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

