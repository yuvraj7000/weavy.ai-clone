"use client";

import { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Type } from "lucide-react";

interface TextNodeData {
  text: string;
}

function TextNode({ id, data }: NodeProps<TextNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg min-w-[250px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border-b border-[#2a2a2a] rounded-t-lg">
        <Type className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">Prompt</span>
      </div>
      <div className="p-3">
        <textarea
          value={data.text || ""}
          onChange={handleTextChange}
          placeholder="Enter text..."
          className="w-full min-h-[80px] p-2 text-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-300 placeholder-gray-500"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-[#0a0a0a]"
      />
    </div>
  );
}

export default memo(TextNode);

