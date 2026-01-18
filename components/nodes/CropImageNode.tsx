"use client";

import React, { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Crop, Loader2, ArrowRight } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useToast } from "@/components/Toast";
import type { cropImageTask } from "@/src/trigger/cropImage.task";
import { emitRunStatusUpdate } from "@/components/RightSidebar";

interface CropImageNodeData {
  imageUrl?: string; // Input image URL
  croppedImageUrl?: string; // Output cropped image URL
  xPercent?: number; // 0-100, default: 0
  yPercent?: number; // 0-100, default: 0
  widthPercent?: number; // 0-100, default: 100
  heightPercent?: number; // 0-100, default: 100
  loading?: boolean;
  error?: string;
  runId?: string;
  publicAccessToken?: string;
  failed?: boolean;
}

function CropImageNode({ id, data }: NodeProps<CropImageNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { showToast } = useToast();
  
  const [xPercent, setXPercent] = useState(data.xPercent?.toString() || "0");
  const [yPercent, setYPercent] = useState(data.yPercent?.toString() || "0");
  const [widthPercent, setWidthPercent] = useState(data.widthPercent?.toString() || "100");
  const [heightPercent, setHeightPercent] = useState(data.heightPercent?.toString() || "100");

  // Use realtime run hook if runId and publicAccessToken are available
  const { run, error: realtimeError } = useRealtimeRun<typeof cropImageTask>(
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
        const status = run.status as "EXECUTING" | "WAITING" | "COMPLETED" | "FAILED" | "CRASHED";
        if (["EXECUTING", "WAITING", "COMPLETED", "FAILED", "CRASHED"].includes(run.status)) {
          emitRunStatusUpdate({
            id: run.id,
            status,
            nodeId: id,
            nodeType: "cropImage",
            nodeName: "Crop Image Node",
            error: run.status === "FAILED" || run.status === "CRASHED" ? "Task failed" : undefined,
            output: run.output,
          });
        }
      }

      if (run.status === "COMPLETED" && run.output) {
        const result = run.output as { success: boolean; data?: { url: string; base64?: string }; error?: string };
        if (result.success && result.data) {
          updateNodeData(id, {
            croppedImageUrl: result.data.url,
            loading: false,
          });
        } else if (result.error) {
          showToast(`Error: ${result.error}`, "error");
          updateNodeData(id, {
            loading: false,
            error: result.error,
            failed: true,
          });
        }
      } else if (run.status === "FAILED" || run.status === "CRASHED") {
        const errorMsg = "Task failed. Check Trigger.dev dashboard for details.";
        showToast(errorMsg, "error");
        updateNodeData(id, {
          loading: false,
          error: errorMsg,
          failed: true,
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

  // Get connected image input
  const connectedImage = useWorkflowStore((state) => {
    const incomingEdge = state.edges.find((e) => e.target === id && e.targetHandle === "image");
    if (incomingEdge) {
      const sourceNode = state.nodes.find((n) => n.id === incomingEdge.source);
      if (sourceNode?.type === "image") {
        return sourceNode.data?.imageUrl || sourceNode.data?.imageBase64;
      }
    }
    return null;
  });

  // Update image URL when connected
  React.useEffect(() => {
    if (connectedImage && connectedImage !== data.imageUrl) {
      updateNodeData(id, { imageUrl: connectedImage });
    }
  }, [connectedImage, data.imageUrl, id, updateNodeData]);

  const handleParameterChange = useCallback(
    (param: "xPercent" | "yPercent" | "widthPercent" | "heightPercent", value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return; // Invalid value
      }

      if (param === "xPercent") {
        setXPercent(value);
        updateNodeData(id, { xPercent: numValue });
      } else if (param === "yPercent") {
        setYPercent(value);
        updateNodeData(id, { yPercent: numValue });
      } else if (param === "widthPercent") {
        setWidthPercent(value);
        updateNodeData(id, { widthPercent: numValue });
      } else if (param === "heightPercent") {
        setHeightPercent(value);
        updateNodeData(id, { heightPercent: numValue });
      }
    },
    [id, updateNodeData]
  );

  const handleRun = useCallback(async () => {
    if (!data.imageUrl && !connectedImage) {
      showToast("Please connect an image to the input handle", "error");
      return;
    }

    const imageUrl = data.imageUrl || connectedImage;
    if (!imageUrl) return;

    updateNodeData(id, { loading: true, error: undefined });

    try {
      const response = await fetch("/api/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          xPercent: parseFloat(xPercent) || 0,
          yPercent: parseFloat(yPercent) || 0,
          widthPercent: parseFloat(widthPercent) || 100,
          heightPercent: parseFloat(heightPercent) || 100,
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
        const errorMsg = result.error || "Failed to trigger crop image task";
        showToast(errorMsg, "error");
        updateNodeData(id, {
          loading: false,
          error: errorMsg,
        });
      }
    } catch (error) {
      console.error("Error cropping image:", error);
      const errorMsg = "Failed to crop image";
      showToast(errorMsg, "error");
      updateNodeData(id, {
        loading: false,
        error: errorMsg,
        failed: true,
      });
    }
  }, [id, data.imageUrl, connectedImage, xPercent, yPercent, widthPercent, heightPercent, updateNodeData, showToast]);

  // Listen for external run requests (from multi-node execution)
  useEffect(() => {
    const handleRunNode = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; nodeType?: string }>;
      if (customEvent.detail.nodeId === id && !data.loading) {
        handleRun();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("run-node", handleRunNode);
      return () => {
        window.removeEventListener("run-node", handleRunNode);
      };
    }
  }, [id, data.loading, handleRun]);

  const displayImage = data.croppedImageUrl;
  const inputImage = data.imageUrl || connectedImage;
  
  // Calculate crop preview overlay dimensions
  const x = parseFloat(xPercent) || 0;
  const y = parseFloat(yPercent) || 0;
  const width = parseFloat(widthPercent) || 100;
  const height = parseFloat(heightPercent) || 100;

  // Clear failed state on click
  const handleNodeClick = useCallback(() => {
    if (data.failed) {
      updateNodeData(id, { failed: false });
    }
  }, [id, data.failed, updateNodeData]);

  // Select node when clicking header
  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const { onNodesChange } = useWorkflowStore.getState();
    onNodesChange([{ id, type: 'select', selected: true }]);
  }, [id]);

  return (
    <div 
      className="bg-[#212126] rounded-lg min-w-[350px] relative group"
      onClick={handleNodeClick}
    >
      {/* Image Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "30%" }}
      />
      <div
        className="absolute left-[-45px] top-[30%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Image
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={handleHeaderClick}
        >
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-gray-400" />
            <span className="text-md py-2 font-medium text-[#919196]">Crop Image</span>
          </div>
          <button
            onClick={handleRun}
            disabled={data.loading || !data.imageUrl}
            className="px-2 py-1 text-sm border border-[#5C5C5F] text-gray-400 rounded-[4px] hover:bg-[#3d3d42] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {data.loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cropping...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
        </div>

        {/* Crop Parameters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[#919196] mb-1 block">X %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={xPercent}
              onChange={(e) => handleParameterChange("xPercent", e.target.value)}
              disabled={data.loading}
              className="w-full p-2 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-[#919196] mb-1 block">Y %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={yPercent}
              onChange={(e) => handleParameterChange("yPercent", e.target.value)}
              disabled={data.loading}
              className="w-full p-2 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-[#919196] mb-1 block">Width %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={widthPercent}
              onChange={(e) => handleParameterChange("widthPercent", e.target.value)}
              disabled={data.loading}
              className="w-full p-2 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="100"
            />
          </div>
          <div>
            <label className="text-xs text-[#919196] mb-1 block">Height %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={heightPercent}
              onChange={(e) => handleParameterChange("heightPercent", e.target.value)}
              disabled={data.loading}
              className="w-full p-2 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="100"
            />
          </div>
        </div>

        {/* Crop Preview - Show input image with crop overlay */}
        {inputImage && !displayImage && (
          <div className="relative bg-[#353539] rounded p-2 mt-2 overflow-hidden">
            <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: "200px" }}>
              <img
                src={inputImage}
                alt="Crop preview"
                className="w-full h-full object-contain rounded"
              />
              {/* Crop overlay - darken area outside crop box */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top overlay */}
                <div
                  className="absolute top-0 left-0 bg-black/60"
                  style={{
                    width: "100%",
                    height: `${y}%`,
                  }}
                />
                {/* Bottom overlay */}
                <div
                  className="absolute bottom-0 left-0 bg-black/60"
                  style={{
                    width: "100%",
                    height: `${100 - y - height}%`,
                  }}
                />
                {/* Left overlay */}
                <div
                  className="absolute left-0 bg-black/60"
                  style={{
                    width: `${x}%`,
                    top: `${y}%`,
                    height: `${height}%`,
                  }}
                />
                {/* Right overlay */}
                <div
                  className="absolute right-0 bg-black/60"
                  style={{
                    width: `${100 - x - width}%`,
                    top: `${y}%`,
                    height: `${height}%`,
                  }}
                />
                {/* Crop box border */}
                <div
                  className="absolute border-2 border-yellow-400 border-dashed"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                />
                {/* Crop info label */}
                <div
                  className="absolute bg-yellow-400/90 text-black text-xs px-2 py-1 rounded font-medium"
                  style={{
                    left: `${x}%`,
                    top: `${Math.max(y - 20, 0)}%`,
                    transform: y < 20 ? "translateY(100%)" : "none",
                  }}
                >
                  {width.toFixed(0)}% × {height.toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1 text-center">Preview</div>
          </div>
        )}

        {/* Cropped Result Image */}
        {displayImage && (
          <div className="relative bg-[#353539] rounded p-2 mt-2">
            <img
              src={displayImage}
              alt="Cropped result"
              className="w-full h-auto max-h-[200px] object-contain rounded"
            />
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-600 text-white text-xs rounded">
              Cropped
            </div>
          </div>
        )}

      </div>

      {/* Cropped Image Output Handle - Right side */}
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

export default memo(CropImageNode);

