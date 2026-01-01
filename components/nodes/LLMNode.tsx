"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

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

  const [loading, setLoading] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(data.systemPrompt || "");
  const systemPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const prevSystemPromptRef = useRef<string | undefined>(undefined);

  // Sync local state when data changes from outside (but not from our own updates)
  useEffect(() => {
    if (data.systemPrompt !== undefined && data.systemPrompt !== prevSystemPromptRef.current) {
      prevSystemPromptRef.current = data.systemPrompt;
      setLocalSystemPrompt(data.systemPrompt || "");
    }
  }, [data.systemPrompt]);

  // Auto-resize textarea function
  const adjustSystemPromptHeight = useCallback(() => {
    const textarea = systemPromptTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
    }
  }, []);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalSystemPrompt(newValue);
      updateNodeData(id, { systemPrompt: newValue });
      // Adjust height after state update
      setTimeout(adjustSystemPromptHeight, 0);
    },
    [id, updateNodeData, adjustSystemPromptHeight]
  );

  // Adjust height when system prompt changes from external source
  useEffect(() => {
    adjustSystemPromptHeight();
  }, [localSystemPrompt, adjustSystemPromptHeight]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    updateNodeData(id, { loading: true });

    try {
      // Get fresh inputs from store
      const state = useWorkflowStore.getState();
      const incomingEdges = state.edges.filter((e) => e.target === id);
      const systemPrompt = localSystemPrompt || "";
      let prompt = "";
      const images: string[] = [];

      for (const edge of incomingEdges) {
        const sourceNode = state.nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        const targetHandle = edge.targetHandle;
        
        if (sourceNode.type === "text" && targetHandle === "prompt") {
          const text = sourceNode.data?.text || "";
          prompt = text;
        } else if (sourceNode.type === "image" && targetHandle === "image") {
          const imageUrl = sourceNode.data?.imageUrl || sourceNode.data?.imageBase64;
          if (imageUrl) {
            images.push(imageUrl);
          }
        }
      }

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
  }, [id, data.model, localSystemPrompt, updateNodeData]);

  return (
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      {/* Prompt Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="w-4 h-4 bg-[#FFA500] border-2 border-black rounded-full"
        style={{ top: "35%" }}
      />
      <div
        className="absolute left-[-55px] top-[35%] transform -translate-y-1/2 text-sm font-medium text-[#d4945a] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
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
            disabled={loading}
            className="px-2 py-1 text-sm border border-[#5C5C5F] text-gray-400 rounded-[4px] hover:bg-[#3d3d42] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#353539] flex items-center gap-2 transition-colors"
          >
            {loading ? (
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
            disabled={loading}
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

        {/* System Prompt Textarea */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-md font-medium text-[#919196] pointer-events-none">
              System Prompt
            </span>
          </div>
          <textarea
            ref={systemPromptTextareaRef}
            value={localSystemPrompt}
            onChange={handleSystemPromptChange}
            placeholder="System prompt (optional)..."
            className="w-full min-h-[80px] max-w-[500px] p-4 mt-2 text-sm bg-[#353539] border-none rounded resize-none focus:outline-none text-white placeholder-[#5C5C5F] disabled:opacity-70 overflow-y-auto"
            disabled={loading}
            style={{ height: '80px' }}
          />
        </div>
      </div>
      
      {/* Result Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="w-4 h-4 bg-[#3b82f6] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-45px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#6b8fb8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Result
      </div>
    </div>
  );
}

export default memo(LLMNode);

