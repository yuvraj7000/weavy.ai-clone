"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
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
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  // Auto-resize output textarea function
  const adjustOutputHeight = useCallback(() => {
    const textarea = outputTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(150, textarea.scrollHeight)}px`;
    }
  }, []);

  // Adjust height when output changes
  useEffect(() => {
    if (data.output) {
      setTimeout(adjustOutputHeight, 0);
    }
  }, [data.output, adjustOutputHeight]);

  const handleRun = useCallback(async () => {
    setLoading(true);
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
        setTimeout(adjustOutputHeight, 0);
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
  }, [id, data.model, updateNodeData, adjustOutputHeight]);

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
            placeholder={loading ? "Running..." : "Result will appear here after running..."}
            readOnly
            className="w-full min-h-[150px] max-w-[500px] p-4 mt-2 text-sm bg-[#353539] border-none rounded resize-none focus:outline-none text-white placeholder-[#5C5C5F] disabled:opacity-70 overflow-y-auto"
            disabled={loading}
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

