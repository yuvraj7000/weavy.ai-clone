"use client";

import React, { memo, useCallback, useState, useEffect, useRef } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Type } from "lucide-react";

interface TextNodeData {
  text: string;
}

function TextNode({ id, data }: NodeProps<TextNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  
  // Use specific selector - only re-renders when relevant edges or nodes change
  const connectedResult = useWorkflowStore((state) => {
    const incomingEdge = state.edges.find((e) => e.target === id && e.targetHandle === "input");
    if (incomingEdge) {
      const sourceNode = state.nodes.find((n) => n.id === incomingEdge.source);
      if (sourceNode?.type === "llm" && sourceNode.data?.output) {
        return sourceNode.data.output as string;
      }
    }
    return null;
  });

  // Local state for input to prevent re-renders on every keystroke
  const [localText, setLocalText] = useState(data.text || "");
  const prevConnectedResultRef = React.useRef<string | null>(null);
  const prevDataTextRef = React.useRef<string | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when data changes from outside (e.g., connected result)
  // This pattern is necessary to sync external state changes (from connected nodes) to local state
  useEffect(() => {
    if (connectedResult && connectedResult !== prevConnectedResultRef.current) {
      prevConnectedResultRef.current = connectedResult;
      setLocalText(connectedResult);
      updateNodeData(id, { text: connectedResult });
    } else if (!connectedResult) {
      prevConnectedResultRef.current = null;
    }
  }, [connectedResult, id, updateNodeData]);

  // Sync local state when data.text changes from outside (but not from our own updates)
  // @ts-ignore - React Compiler warning about setState in effects, but this is necessary for syncing external state
  useEffect(() => {
    if (!connectedResult && data.text !== undefined && data.text !== prevDataTextRef.current) {
      prevDataTextRef.current = data.text;
      setLocalText(data.text || "");
    }
  }, [data.text, connectedResult]);

  // Auto-resize textarea function
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
    }
  }, []);

  // Use connected result if available, otherwise use local text
  const displayText = connectedResult || localText || "";

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalText(newValue);
      // Debounce the store update
      updateNodeData(id, { text: newValue });
      // Adjust height after state update
      setTimeout(adjustTextareaHeight, 0);
    },
    [id, updateNodeData, adjustTextareaHeight]
  );

  // Adjust height when text changes from external source
  useEffect(() => {
    adjustTextareaHeight();
  }, [displayText, adjustTextareaHeight]);

  return (
    <div className="bg-[#212126] rounded-lg min-w-[350px] relative group">
      {/* Input Handle - Left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 bg-[#3b82f6] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute left-[-38px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#6b8fb8] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Input
      </div>

      <div className="p-4">
        {/* Prompt label at top-left */}
        <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-gray-400" />
        <span className=" text-md py-2 font-medium text-[#919196] pointer-events-none z-10">
          Text
        </span>
        </div>
        
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleTextChange}
            placeholder={connectedResult ? "Connected from LLM result" : "Enter text..."}
            disabled={!!connectedResult}
            className="w-full min-h-[200px] max-w-[500px] p-4 mt-2 text-sm bg-[#353539] border-none rounded resize-none focus:outline-none text-white placeholder-[#5C5C5F] disabled:opacity-70 overflow-y-auto"
            style={{ height: '200px' }}
          />
      </div>
      
      {/* Prompt Output Handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        className="w-8 h-8 bg-[#FFA500] border-2 border-black rounded-full"
        style={{ top: "50%" }}
      />
      <div
        className="absolute right-[-50px] top-[50%] transform -translate-y-1/2 text-sm font-medium text-[#d4945a] drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        style={{ marginTop: "-14px" }}
      >
        Prompt
      </div>
    </div>
  );
}

export default memo(TextNode);

