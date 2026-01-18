import { logger, task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const execAsync = promisify(exec);

interface CropImagePayload {
  imageUrl: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 600, // 10 minutes max for image processing
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
  },
  run: async (payload: CropImagePayload) => {
    logger.log("Executing crop image task", { imageUrl: payload.imageUrl });

    try {
      // Download image
      const imageResponse = await fetch(payload.imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const tempDir = "/tmp";
      const inputFileName = `input-${crypto.randomBytes(8).toString("hex")}.jpg`;
      const outputFileName = `output-${crypto.randomBytes(8).toString("hex")}.jpg`;
      const inputPath = path.join(tempDir, inputFileName);
      const outputPath = path.join(tempDir, outputFileName);

      // Save input image
      await fs.writeFile(inputPath, imageBuffer);
      logger.log("Image saved to temp file", { inputPath });

      // Get image dimensions using ffprobe
      // Use FFPROBE_PATH if available (set by Trigger.dev FFmpeg extension), otherwise use "ffprobe"
      const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
      let width = 0;
      let height = 0;
      try {
        const { stdout: identifyOutput } = await execAsync(
          `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of json "${inputPath}"`
        );
        const dimensions = JSON.parse(identifyOutput);
        width = dimensions.streams[0]?.width || 0;
        height = dimensions.streams[0]?.height || 0;
      } catch (ffprobeError: unknown) {
        const error = ffprobeError as { message?: string; code?: number };
        if (error.message?.includes("not found") || error.code === 127) {
          throw new Error(
            "FFmpeg is not installed in the execution environment. " +
            "Please install FFmpeg or use a custom Docker image with FFmpeg pre-installed. " +
            "See: https://trigger.dev/docs/guides/docker"
          );
        }
        throw new Error(`Failed to get image dimensions: ${error.message || "Unknown error"}`);
      }

      if (width === 0 || height === 0) {
        throw new Error("Failed to get image dimensions");
      }

      logger.log("Image dimensions", { width, height });

      // Calculate crop parameters
      const x = Math.round((width * payload.xPercent) / 100);
      const y = Math.round((height * payload.yPercent) / 100);
      const cropWidth = Math.round((width * payload.widthPercent) / 100);
      const cropHeight = Math.round((height * payload.heightPercent) / 100);

      logger.log("Crop parameters", { x, y, cropWidth, cropHeight });

      // Crop image using FFmpeg
      // Use FFMPEG_PATH if available (set by Trigger.dev FFmpeg extension), otherwise use "ffmpeg"
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      try {
        await execAsync(
          `"${ffmpegPath}" -i "${inputPath}" -vf "crop=${cropWidth}:${cropHeight}:${x}:${y}" "${outputPath}" -y`
        );
      } catch (ffmpegError: unknown) {
        const error = ffmpegError as { message?: string; code?: number };
        if (error.message?.includes("not found") || error.code === 127) {
          throw new Error(
            "FFmpeg is not installed in the execution environment. " +
            "Please install FFmpeg or use a custom Docker image with FFmpeg pre-installed. " +
            "See: https://trigger.dev/docs/guides/docker"
          );
        }
        throw new Error(`Failed to crop image: ${error.message || "Unknown error"}`);
      }

      logger.log("Image cropped successfully");

      // Read cropped image
      const croppedBuffer = await fs.readFile(outputPath);

      // Convert to base64 (in production, upload to storage)
      const base64 = croppedBuffer.toString("base64");
      const contentType = "image/jpeg";
      const dataUrl = `data:${contentType};base64,${base64}`;

      // Cleanup temp files
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});

      const result = {
        success: true,
        data: {
          url: dataUrl, // In production, this should be a storage URL
          base64: base64,
        },
      };

      return result;
    } catch (error: unknown) {
      logger.error("Crop image task error", { error });
      const errorMessage = error instanceof Error ? error.message : "Failed to crop image";

      throw new Error(errorMessage);
    }
  },
});

