"use client";

import { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Sparkles, Play, Loader2 } from "lucide-react";

interface LLMNodeData {
  model: string;
  systemPrompt?: string;
  output?: string;
  loading?: boolean;
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

function LLMNode({ id, data }: NodeProps<LLMNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const [loading, setLoading] = useState(false);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { systemPrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const collectInputs = useCallback(() => {
    // Find connected nodes
    const incomingEdges = edges.filter((e) => e.target === id);
    const systemPrompt = data.systemPrompt || "";
    let prompt = "";
    const images: string[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;
      
      if (sourceNode.type === "text") {
        const text = sourceNode.data?.text || "";
        if (targetHandle === "prompt") {
          prompt = text;
        }
      } else if (sourceNode.type === "image") {
        // Use Cloudinary URL if available, otherwise use base64
        const imageUrl = sourceNode.data?.imageUrl || sourceNode.data?.imageBase64;
        if (imageUrl && targetHandle === "image") {
          images.push(imageUrl);
        }
      }
    }

    return { systemPrompt, prompt, images };
  }, [id, nodes, edges, data]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    updateNodeData(id, { loading: true });

    try {
      const { systemPrompt, prompt, images } = collectInputs();

      if (!prompt && images.length === 0) {
        alert("Please connect a Prompt node or Image node to the input handles");
        setLoading(false);
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

      if (result.success) {
        updateNodeData(id, {
          output: result.data.text,
          loading: false,
        });
      } else {
        alert(`Error: ${result.error}`);
        updateNodeData(id, { loading: false });
      }
    } catch (error) {
      console.error("Error executing LLM:", error);
      alert("Failed to execute LLM request");
      updateNodeData(id, { loading: false });
    } finally {
      setLoading(false);
    }
  }, [id, data, collectInputs, updateNodeData]);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg min-w-[280px] relative">
      {/* Prompt Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="w-4 h-4 bg-white border-2 border-black rounded-full"
        style={{ top: "35%" }}
      />
      <div
        className="absolute left-[-60px] top-[35%] transform -translate-y-1/2 text-sm font-medium text-[#FFA500] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none"
        style={{ marginTop: "-8px" }}
      >
        Prompt
      </div>

      {/* Image Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-4 h-4 bg-white border-2 border-black rounded-full"
        style={{ top: "55%" }}
      />
      <div
        className="absolute left-[-60px] top-[55%] transform -translate-y-1/2 text-sm font-medium text-[#FFA500] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none"
        style={{ marginTop: "-8px" }}
      >
        Image*
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border-b border-[#2a2a2a] rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-300">{data.model || "Gemini 2.5 Flash"}</span>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Run</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* Model Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Model
          </label>
          <select
            value={data.model || "gemini-2.5-flash"}
            onChange={handleModelChange}
            className="w-full p-2 text-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-300"
            disabled={loading}
          >
            {GEMINI_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt Input */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            System Prompt
          </label>
          <input
            type="text"
            value={data.systemPrompt || ""}
            onChange={handleSystemPromptChange}
            placeholder="System prompt (optional)..."
            className="w-full p-2 text-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-300 placeholder-gray-500"
            disabled={loading}
          />
        </div>

        {/* Output Section */}
        {data.output && (
          <div className="mt-3 p-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded">
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Output
            </label>
            <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
              {data.output}
            </div>
          </div>
        )}
      </div>
      {/* Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-green-500 border-2 border-[#0a0a0a] rounded-full"
        style={{ top: "50%" }}
      />
    </div>
  );
}

export default memo(LLMNode);

