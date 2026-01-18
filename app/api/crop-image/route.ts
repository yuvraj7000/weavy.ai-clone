import { NextRequest, NextResponse } from "next/server";
import { triggerCropImageTask } from "@/lib/trigger";
import { z } from "zod";

const CropImageSchema = z.object({
  imageUrl: z.string().url(),
  xPercent: z.number().min(0).max(100).default(0),
  yPercent: z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(0).max(100).default(100),
  heightPercent: z.number().min(0).max(100).default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = CropImageSchema.safeParse(body);
    
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

    // Trigger crop image task via Trigger.dev
    const handle = await triggerCropImageTask({
      imageUrl: validatedData.imageUrl,
      xPercent: validatedData.xPercent,
      yPercent: validatedData.yPercent,
      widthPercent: validatedData.widthPercent,
      heightPercent: validatedData.heightPercent,
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
    console.error("Crop Image API error:", error);
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
