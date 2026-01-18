"use client";

import { memo, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useToast } from "@/components/Toast";
import type { executeLLMTask } from "@/src/trigger/llm.task";

interface LLMNodeData {
  model: string;
  systemPrompt?: string;
  output?: string;
  loading?: boolean;
  runId?: string;
  publicAccessToken?: string;
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

function LLMNode({ id, data }: NodeProps<LLMNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Use realtime run hook if runId and publicAccessToken are available
  const { run, error: realtimeError } = useRealtimeRun<typeof executeLLMTask>(
    data.runId || "",
    {
      accessToken: data.publicAccessToken || "",
      enabled: !!data.runId && !!data.publicAccessToken,
    }
  );

  // Auto-resize output textarea function
  const adjustOutputHeight = useCallback(() => {
    const textarea = outputTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(150, textarea.scrollHeight)}px`;
    }
  }, []);

  // Derive loading state from both store and realtime run status
  const isLoading = data.loading || (run && (run.status === "EXECUTING" || run.status === "WAITING"));

  // Update node data when realtime run updates
  useEffect(() => {
    if (run) {
      if (run.status === "COMPLETED" && run.output) {
        const result = run.output as { success: boolean; data?: { text: string }; error?: string };
        if (result.success && result.data) {
          updateNodeData(id, {
            output: result.data.text,
            loading: false,
          });
          showToast("LLM task completed successfully!", "success");
          setTimeout(adjustOutputHeight, 0);
        } else if (result.error) {
          showToast(`Error: ${result.error}`, "error");
          updateNodeData(id, {
            loading: false,
          });
        }
      } else if (run.status === "FAILED" || run.status === "CRASHED") {
        const errorMsg = "Task failed. Check Trigger.dev dashboard for details.";
        showToast(errorMsg, "error");
        updateNodeData(id, {
          loading: false,
        });
      } else if (run.status === "EXECUTING" || run.status === "WAITING") {
        updateNodeData(id, {
          loading: true,
        });
      }
    }
  }, [run, id, updateNodeData, adjustOutputHeight, showToast]);

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      console.error("Realtime error:", realtimeError);
      showToast("Realtime connection error", "error");
      updateNodeData(id, {
        loading: false,
      });
    }
  }, [realtimeError, id, updateNodeData, showToast]);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  // Adjust height when output changes
  useEffect(() => {
    if (data.output) {
      setTimeout(adjustOutputHeight, 0);
    }
  }, [data.output, adjustOutputHeight]);

  const handleRun = useCallback(async () => {
    // Prevent running if already loading
    if (data.loading) return;

    updateNodeData(id, { loading: true });

    try {
      // Get fresh inputs from store
      const state = useWorkflowStore.getState();
      const incomingEdges = state.edges.filter((e) => e.target === id);
      
      let systemPrompt = "";
      let prompt = "";
      const images: string[] = [];

      for (const edge of incomingEdges) {
        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        const targetHandle = edge.targetHandle;
        
        // System prompt from TextNode or LLM result
        if (targetHandle === "systemPrompt") {
          if (sourceNode.type === "text") {
            const text = sourceNode.data?.text || "";
            systemPrompt = text;
          } else if (sourceNode.type === "llm") {
            const output = sourceNode.data?.output || "";
            systemPrompt = output;
          }
        }
        // Prompt from TextNode or LLM result
        else if (targetHandle === "prompt") {
          if (sourceNode.type === "text") {
            const text = sourceNode.data?.text || "";
            prompt = text;
          } else if (sourceNode.type === "llm") {
            const output = sourceNode.data?.output || "";
            prompt = output;
          }
        }
        // Image from ImageNode
        else if (sourceNode.type === "image" && targetHandle === "image") {
          const imageUrl = sourceNode.data?.imageUrl || sourceNode.data?.imageBase64;
          if (imageUrl) {
            images.push(imageUrl);
          }
        }
      }

      if (!prompt && images.length === 0) {
        showToast("Please connect a Prompt node or Image node to the input handles", "error");
        updateNodeData(id, { loading: false });
        return;
      }

      const response = await fetch("/api/llm/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model || "gemini-2.5-flash",
          systemPrompt: systemPrompt || undefined,
          userMessage: prompt || (images.length > 0 ? "Analyze the images" : ""),
          images: images.length > 0 ? images : undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.runId && result.publicAccessToken) {
        // Task triggered successfully - store runId and token for realtime updates
        // Loading state will be managed by realtime run updates
        updateNodeData(id, {
          loading: true,
          runId: result.runId,
          publicAccessToken: result.publicAccessToken,
        });
        showToast("LLM task started!", "success");
        // The useRealtimeRun hook will automatically update the node when the task completes
      } else {
        const errorMsg = result.error || "Failed to trigger task";
        showToast(errorMsg, "error");
        updateNodeData(id, { loading: false });
      }
    } catch (error) {
      console.error("Error executing LLM:", error);
      showToast("Failed to execute LLM request", "error");
      updateNodeData(id, { loading: false });
    }
  }, [id, data.model, data.loading, updateNodeData, showToast]);

  return (
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      {/* System Prompt Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="systemPrompt"
        className="w-4 h-4 bg-[#FFA500] border-2 border-black rounded-full"
        style={{ top: "25%" }}
      />
      <div
        className="absolute left-[-100px] top-[25%] transform -translate-y-1/2 text-sm font-medium text-[#FFA500] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-15px" }}
      >
        System Prompt
      </div>

      {/* Prompt Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="w-4 h-4 bg-[#FFA500] border-2 border-black rounded-full"
        style={{ top: "40%" }}
      />
      <div
        className="absolute left-[-55px] top-[40%] transform -translate-y-1/2 text-sm font-medium text-[#d4945a] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-15px" }}
      >
        Prompt*
      </div>

      {/* Image Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-4 h-4 bg-[#a855f7] border-2 border-black rounded-full"
        style={{ top: "55%" }}
      />
      <div
        className="absolute left-[-45px] top-[55%] transform -translate-y-1/2 text-sm font-medium text-[#9b7fa8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-15px" }}
      >
        Image
      </div>

      <div className="p-4 space-y-3">
        {/* Header with Model and Run button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-400" />
            <span className="text-md py-2 font-medium text-[#919196]">{data.model || "Gemini 2.5 Flash"}</span>
          </div>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="px-2 py-1 text-sm border border-[#5C5C5F] text-gray-400 rounded-[4px] hover:bg-[#3d3d42] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#353539] flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Run Model</span>
              </>
            )}
          </button>
        </div>

        {/* Model Dropdown */}
        <div>
          <select
            value={data.model || "gemini-2.5-flash"}
            onChange={handleModelChange}
            className="w-full p-3 text-sm bg-[#353539] border-none rounded focus:outline-none focus:ring-2 focus:ring-[#5C5C5F] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
            disabled={isLoading}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px'
            }}
          >
            {GEMINI_MODELS.map((model) => (
              <option key={model} value={model} className="bg-[#353539] text-white">
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Result Output Display */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-md font-medium text-[#919196] pointer-events-none">
              Result
            </span>
          </div>
          <textarea
            ref={outputTextareaRef}
            value={data.output || ""}
            placeholder={isLoading ? "Running..." : "Result will appear here after running..."}
            readOnly
            className="w-full min-h-[150px] max-w-[500px] p-4 mt-2 text-sm bg-[#353539] border-none rounded resize-none focus:outline-none text-white placeholder-[#5C5C5F] disabled:opacity-70 overflow-y-auto"
            disabled={isLoading}
            style={{ height: data.output ? 'auto' : '150px' }}
          />
        </div>
      </div>
      
      {/* Result Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="w-4 h-4 bg-[#FFA500] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-45px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#FFA500] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Result
      </div>
    </div>
  );
}

export default memo(LLMNode);

