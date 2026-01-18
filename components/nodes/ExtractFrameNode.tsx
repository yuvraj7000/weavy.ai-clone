"use client";

import React, { memo, useCallback, useState, useEffect, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Film, Loader2, ArrowRight } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useToast } from "@/components/Toast";
import type { extractFrameTask } from "@/src/trigger/extractFrame.task";

interface ExtractFrameNodeData {
  videoUrl?: string; // Input video URL
  extractedFrameUrl?: string; // Output extracted frame image URL
  timestamp?: string; // "5" (seconds) or "50%" (percentage)
  loading?: boolean;
  error?: string;
  runId?: string;
  publicAccessToken?: string;
  videoDuration?: number; // Video duration in seconds
}

function ExtractFrameNode({ id, data }: NodeProps<ExtractFrameNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [timestamp, setTimestamp] = useState(data.timestamp || "50%");
  const [videoDuration, setVideoDuration] = useState<number | null>(data.videoDuration || null);

  // Use realtime run hook if runId and publicAccessToken are available
  const { run, error: realtimeError } = useRealtimeRun<typeof extractFrameTask>(
    data.runId || "",
    {
      accessToken: data.publicAccessToken || "",
      enabled: !!data.runId && !!data.publicAccessToken,
    }
  );

  // Update node data when realtime run updates
  useEffect(() => {
    if (run) {
      // Emit run status update for RightSidebar
      if (typeof window !== "undefined") {
        const { emitRunStatusUpdate } = require("@/components/RightSidebar");
        emitRunStatusUpdate({
          id: run.id,
          status: run.status,
          nodeId: id,
          nodeType: "extractFrame",
          nodeName: "Extract Frame Node",
          error: run.status === "FAILED" || run.status === "CRASHED" ? "Task failed" : undefined,
          output: run.output,
        });
      }

      if (run.status === "COMPLETED" && run.output) {
        const result = run.output as { success: boolean; data?: { url: string; base64?: string }; error?: string };
        if (result.success && result.data) {
          updateNodeData(id, {
            extractedFrameUrl: result.data.url,
            loading: false,
          });
        } else if (result.error) {
          showToast(`Error: ${result.error}`, "error");
          updateNodeData(id, {
            loading: false,
            error: result.error,
          });
        }
      } else if (run.status === "FAILED" || run.status === "CRASHED") {
        const errorMsg = "Task failed. Check Trigger.dev dashboard for details.";
        showToast(errorMsg, "error");
        updateNodeData(id, {
          loading: false,
          error: errorMsg,
        });
      } else if (run.status === "EXECUTING" || run.status === "WAITING") {
        updateNodeData(id, {
          loading: true,
        });
      }
    }
  }, [run, id, updateNodeData, showToast]);

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      console.error("Realtime error:", realtimeError);
      updateNodeData(id, {
        loading: false,
        error: realtimeError.message,
      });
    }
  }, [realtimeError, id, updateNodeData]);

  // Get connected video input
  const connectedVideo = useWorkflowStore((state) => {
    const incomingEdge = state.edges.find((e) => e.target === id && e.targetHandle === "video");
    if (incomingEdge) {
      const sourceNode = state.nodes.find((n) => n.id === incomingEdge.source);
      if (sourceNode?.type === "video") {
        return sourceNode.data?.videoUrl || sourceNode.data?.videoBase64;
      }
    }
    return null;
  });

  // Update video URL when connected
  React.useEffect(() => {
    if (connectedVideo && connectedVideo !== data.videoUrl) {
      updateNodeData(id, { videoUrl: connectedVideo });
      setVideoDuration(null); // Reset duration when video changes
    }
  }, [connectedVideo, data.videoUrl, id, updateNodeData]);

  // Get video duration when video loads
  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (duration && isFinite(duration)) {
        setVideoDuration(duration);
        updateNodeData(id, { videoDuration: duration });
      }
    }
  }, [id, updateNodeData]);

  const handleTimestampChange = useCallback(
    (value: string) => {
      // Validate timestamp if it's in seconds format
      if (!value.endsWith("%") && videoDuration !== null) {
        const seconds = parseFloat(value);
        if (!isNaN(seconds) && seconds > videoDuration) {
          showToast(`Timestamp (${seconds}s) exceeds video duration (${videoDuration.toFixed(2)}s)`, "error");
          return;
        }
      }
      setTimestamp(value);
      updateNodeData(id, { timestamp: value });
    },
    [id, updateNodeData, videoDuration, showToast]
  );

  const handleRun = useCallback(async () => {
    if (!data.videoUrl && !connectedVideo) {
      showToast("Please connect a video to the input handle", "error");
      return;
    }

    const videoUrl = data.videoUrl || connectedVideo;
    if (!videoUrl) return;

    // Validate timestamp if in seconds format
    if (!timestamp.endsWith("%") && videoDuration !== null) {
      const seconds = parseFloat(timestamp);
      if (!isNaN(seconds) && seconds > videoDuration) {
        showToast(`Timestamp (${seconds}s) exceeds video duration (${videoDuration.toFixed(2)}s)`, "error");
        return;
      }
    }

    updateNodeData(id, { loading: true, error: undefined });

    try {
      const response = await fetch("/api/extract-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          timestamp: timestamp || "50%",
        }),
      });

      const result = await response.json();

      if (result.success && result.runId && result.publicAccessToken) {
        // Task triggered successfully - store runId and token for realtime updates
        updateNodeData(id, {
          loading: true,
          runId: result.runId,
          publicAccessToken: result.publicAccessToken,
        });
        // The useRealtimeRun hook will automatically update the node when the task completes
      } else {
        const errorMsg = result.error || "Failed to trigger extract frame task";
        showToast(errorMsg, "error");
        updateNodeData(id, {
          loading: false,
          error: errorMsg,
        });
      }
    } catch (error) {
      console.error("Error extracting frame:", error);
      const errorMsg = "Failed to extract frame";
      showToast(errorMsg, "error");
      updateNodeData(id, {
        loading: false,
        error: errorMsg,
      });
    }
  }, [id, data.videoUrl, connectedVideo, timestamp, videoDuration, updateNodeData, showToast]);

  const displayVideo = data.videoUrl || connectedVideo;

  return (
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      {/* Video Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="video"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "30%" }}
      />
      <div
        className="absolute left-[-45px] top-[30%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Video
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-gray-400" />
            <span className="text-md py-2 font-medium text-[#919196]">Extract Frame</span>
          </div>
          <button
            onClick={handleRun}
            disabled={data.loading || !displayVideo}
            className="px-2 py-1 text-sm border border-[#5C5C5F] text-gray-400 rounded-[4px] hover:bg-[#3d3d42] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {data.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
        </div>

        {/* Timestamp Parameter */}
        <div>
          <label className="text-xs text-[#919196] mb-1 block">Timestamp</label>
          <input
            type="text"
            value={timestamp}
            onChange={(e) => handleTimestampChange(e.target.value)}
            placeholder="50% or 5"
            disabled={data.loading}
            className="w-full p-2 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-[#5C5C5F] mt-1">
            Enter seconds (e.g., "5") or percentage (e.g., "50%")
            {videoDuration !== null && (
              <span className="block mt-1 text-[#919196]">
                Max: {videoDuration.toFixed(2)}s
              </span>
            )}
          </p>
        </div>

        {/* Video Preview */}
        {/* {displayVideo && (
          <div className="relative bg-[#353539] rounded p-2 mt-2">
            <video
              ref={videoRef}
              src={displayVideo}
              controls
              onLoadedMetadata={handleVideoLoadedMetadata}
              className="w-full h-auto max-h-[200px] object-contain rounded"
            />
            {videoDuration !== null && (
              <div className="text-xs text-[#919196] mt-1">
                Duration: {videoDuration.toFixed(2)}s
              </div>
            )}
          </div>
        )} */}

        {/* Extracted Frame Preview */}
        {data.extractedFrameUrl && (
          <div className="relative bg-[#353539] rounded p-2 mt-2">
            <img
              src={data.extractedFrameUrl}
              alt="Extracted frame"
              className="w-full h-auto max-h-[200px] object-contain rounded"
            />
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-600 text-white text-xs rounded">
              Frame Extracted
            </div>
          </div>
        )}

        {/* Error Display */}
        {data.error && (
          <div className="text-xs text-red-400 mt-2">{data.error}</div>
        )}
      </div>

      {/* Extracted Frame Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="image"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-45px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Image
      </div>
    </div>
  );
}

export default memo(ExtractFrameNode);

