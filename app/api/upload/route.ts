import { NextRequest, NextResponse } from "next/server";
import { uploadImageFromBase64, uploadImageFromBuffer } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const base64 = formData.get("base64") as string | null;

    if (!file && !base64) {
      return NextResponse.json(
        {
          success: false,
          error: "Either file or base64 data is required",
        },
        { status: 400 }
      );
    }

    let result;

    if (base64) {
      // Upload from base64
      result = await uploadImageFromBase64(base64);
    } else if (file) {
      // Upload from file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      result = await uploadImageFromBuffer(buffer);
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
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

