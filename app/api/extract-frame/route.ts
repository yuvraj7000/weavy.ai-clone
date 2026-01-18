import { NextRequest, NextResponse } from "next/server";
import { triggerExtractFrameTask } from "@/lib/trigger";
import { z } from "zod";

const ExtractFrameSchema = z.object({
  videoUrl: z.string().url(),
  timestamp: z.string(), // "5" or "50%"
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = ExtractFrameSchema.safeParse(body);
    
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

    // Trigger extract frame task via Trigger.dev
    const handle = await triggerExtractFrameTask({
      videoUrl: validatedData.videoUrl,
      timestamp: validatedData.timestamp,
    });

    return NextResponse.json(
      {
        success: true,
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken,
      },
      { status: 202 }
    );
  } catch (error: unknown) {
    console.error("Extract Frame API error:", error);
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
