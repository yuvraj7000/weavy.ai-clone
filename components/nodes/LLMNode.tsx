"use client";

import { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Sparkles, Play, Loader2 } from "lucide-react";

interface LLMNodeData {
  model: string;
  systemPrompt?: string;
  userMessage?: string;
  output?: string;
  images?: string[];
  loading?: boolean;
}

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { systemPrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleUserMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { userMessage: e.target.value });
    },
    [id, updateNodeData]
  );

  const collectInputs = useCallback(() => {
    // Find connected nodes
    const incomingEdges = edges.filter((e) => e.target === id);
    let systemPrompt = data.systemPrompt || "";
    let userMessage = data.userMessage || "";
    const images: string[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;
      
      if (sourceNode.type === "text") {
        const text = sourceNode.data?.text || "";
        if (targetHandle === "system_prompt") {
          systemPrompt = text;
        } else if (targetHandle === "user_message") {
          userMessage = text;
        } else if (!userMessage) {
          // Default to user message if no specific handle and no user message set
          userMessage = text;
        }
      } else if (sourceNode.type === "image") {
        const imageUrl = sourceNode.data?.imageUrl;
        if (imageUrl && targetHandle === "images") {
          images.push(imageUrl);
        }
      }
    }

    // Use manual inputs if no connections
    if (!systemPrompt && data.systemPrompt) {
      systemPrompt = data.systemPrompt;
    }
    if (!userMessage && data.userMessage) {
      userMessage = data.userMessage;
    }

    return { systemPrompt, userMessage, images };
  }, [id, nodes, edges, data]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    updateNodeData(id, { loading: true });

    try {
      const { systemPrompt, userMessage, images } = collectInputs();

      if (!userMessage && images.length === 0) {
        alert("Please provide a user message or connect image nodes");
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
          userMessage: userMessage || "Analyze the images",
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
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[300px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-300 rounded-t-lg">
        <Sparkles className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">LLM Node</span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            value={data.model || "gemini-2.5-flash"}
            onChange={handleModelChange}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          >
            {GEMINI_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            System Prompt (Optional)
          </label>
          <Handle
            type="target"
            position={Position.Left}
            id="system_prompt"
            className="w-3 h-3 bg-purple-500"
            style={{ top: "30%" }}
          />
          <textarea
            value={data.systemPrompt || ""}
            onChange={handleSystemPromptChange}
            placeholder="System prompt..."
            className="w-full min-h-[60px] p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            User Message
          </label>
          <Handle
            type="target"
            position={Position.Left}
            id="user_message"
            className="w-3 h-3 bg-purple-500"
            style={{ top: "50%" }}
          />
          <textarea
            value={data.userMessage || ""}
            onChange={handleUserMessageChange}
            placeholder="User message..."
            className="w-full min-h-[60px] p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Images (Optional)
          </label>
          <Handle
            type="target"
            position={Position.Left}
            id="images"
            className="w-3 h-3 bg-purple-500"
            style={{ top: "70%" }}
          />
          <div className="text-xs text-gray-500">
            Connect Image Nodes to this handle
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run</span>
            </>
          )}
        </button>

        {data.output && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Output
            </label>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {data.output}
            </div>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}

export default memo(LLMNode);

