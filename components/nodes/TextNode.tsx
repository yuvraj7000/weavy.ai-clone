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
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[250px]">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-300 rounded-t-lg">
        <Type className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">Text Node</span>
      </div>
      <div className="p-3">
        <textarea
          value={data.text || ""}
          onChange={handleTextChange}
          placeholder="Enter text..."
          className="w-full min-h-[80px] p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}

export default memo(TextNode);

