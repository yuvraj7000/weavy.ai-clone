import { NextRequest, NextResponse } from "next/server";
import { 
  uploadImageFromBase64, 
  uploadImageFromBuffer,
  uploadVideoFromBase64,
  uploadVideoFromBuffer 
} from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const base64 = formData.get("base64") as string | null;
    const type = formData.get("type") as string | null; // "image" or "video"

    if (!file && !base64) {
      return NextResponse.json(
        {
          success: false,
          error: "Either file or base64 data is required",
        },
        { status: 400 }
      );
    }

    // Determine resource type from file type or explicit type parameter
    let resourceType: "image" | "video" = "image";
    if (type === "video") {
      resourceType = "video";
    } else if (file) {
      // Check file MIME type
      if (file.type.startsWith("video/")) {
        resourceType = "video";
      } else if (file.type.startsWith("image/")) {
        resourceType = "image";
      }
    } else if (base64) {
      // Check base64 data URL prefix
      if (base64.startsWith("data:video/")) {
        resourceType = "video";
      } else if (base64.startsWith("data:image/")) {
        resourceType = "image";
      }
    }

    let result;

    if (base64) {
      // Upload from base64
      if (resourceType === "video") {
        result = await uploadVideoFromBase64(base64);
      } else {
      result = await uploadImageFromBase64(base64);
      }
    } else if (file) {
      // Upload from file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (resourceType === "video") {
        result = await uploadVideoFromBuffer(buffer);
      } else {
      result = await uploadImageFromBuffer(buffer);
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid upload data",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

