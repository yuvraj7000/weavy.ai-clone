import { logger, task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const execAsync = promisify(exec);

interface ExtractFramePayload {
  videoUrl: string;
  timestamp: string; // "5" (seconds) or "50%" (percentage)
}

async function getVideoDuration(videoPath: string): Promise<number> {
  // Use FFPROBE_PATH if available (set by Trigger.dev FFmpeg extension), otherwise use "ffprobe"
  const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
  try {
    const { stdout } = await execAsync(
      `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number };
    if (err.message?.includes("not found") || err.code === 127) {
      throw new Error(
        "FFmpeg is not installed in the execution environment. " +
        "Please install FFmpeg or use a custom Docker image with FFmpeg pre-installed. " +
        "See: https://trigger.dev/docs/guides/docker"
      );
    }
    throw new Error(`Failed to get video duration: ${err.message || "Unknown error"}`);
  }
}

export const extractFrameTask = task({
  id: "extract-frame",
  maxDuration: 600, // 10 minutes max for video processing
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
  },
  run: async (payload: ExtractFramePayload) => {
    logger.log("Executing extract frame task", { videoUrl: payload.videoUrl, timestamp: payload.timestamp });

    try {
      // Download video
      const videoResponse = await fetch(payload.videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const tempDir = "/tmp";
      const inputFileName = `input-${crypto.randomBytes(8).toString("hex")}.mp4`;
      const outputFileName = `frame-${crypto.randomBytes(8).toString("hex")}.jpg`;
      const inputPath = path.join(tempDir, inputFileName);
      const outputPath = path.join(tempDir, outputFileName);

      // Save input video
      await fs.writeFile(inputPath, videoBuffer);
      logger.log("Video saved to temp file", { inputPath });

      // Calculate timestamp
      let timestampSeconds: number;
      if (payload.timestamp.endsWith("%")) {
        // Percentage
        const percentage = parseFloat(payload.timestamp.replace("%", ""));
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          throw new Error("Invalid percentage. Must be between 0 and 100.");
        }
        const duration = await getVideoDuration(inputPath);
        timestampSeconds = (duration * percentage) / 100;
        logger.log("Calculated timestamp from percentage", { percentage, duration, timestampSeconds });
      } else {
        // Seconds
        timestampSeconds = parseFloat(payload.timestamp);
        if (isNaN(timestampSeconds) || timestampSeconds < 0) {
          throw new Error("Invalid timestamp. Must be a positive number or percentage.");
        }
        logger.log("Using timestamp in seconds", { timestampSeconds });
      }

      // Extract frame using FFmpeg
      // Use FFMPEG_PATH if available (set by Trigger.dev FFmpeg extension), otherwise use "ffmpeg"
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      try {
        await execAsync(
          `"${ffmpegPath}" -i "${inputPath}" -ss ${timestampSeconds} -vframes 1 "${outputPath}" -y`
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
        throw new Error(`Failed to extract frame: ${error.message || "Unknown error"}`);
      }

      logger.log("Frame extracted successfully");

      // Read extracted frame
      const frameBuffer = await fs.readFile(outputPath);

      // Convert to base64 (in production, upload to storage)
      const base64 = frameBuffer.toString("base64");
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
      logger.error("Extract frame task error", { error });
      const errorMessage = error instanceof Error ? error.message : "Failed to extract frame";

      throw new Error(errorMessage);
    }
  },
});

