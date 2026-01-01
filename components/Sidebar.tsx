"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { Type, Image as ImageIcon, Sparkles } from "lucide-react";

export default function Sidebar() {
  const addNode = useWorkflowStore((state) => state.addNode);

  const createTextNode = useCallback(() => {
    const newNode = {
      id: `text-${Date.now()}`,
      type: "text",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { text: "" },
    };
    addNode(newNode);
  }, [addNode]);

  const createImageNode = useCallback(() => {
    const newNode = {
      id: `image-${Date.now()}`,
      type: "image",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {},
    };
    addNode(newNode);
  }, [addNode]);

  const createLLMNode = useCallback(() => {
    const newNode = {
      id: `llm-${Date.now()}`,
      type: "llm",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        output: "",
      },
    };
    addNode(newNode);
  }, [addNode]);

  return (
    <div className="w-64 bg-white border-r border-gray-300 h-full flex flex-col">
      <div className="p-4 border-b border-gray-300">
        <h2 className="text-lg font-semibold text-gray-800">Nodes</h2>
      </div>
      <div className="flex-1 p-4 space-y-3">
        <button
          onClick={createTextNode}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
        >
          <Type className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Text Node</span>
        </button>

        <button
          onClick={createImageNode}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Image Node</span>
        </button>

        <button
          onClick={createLLMNode}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Run Any LLM Node</span>
        </button>
      </div>
    </div>
  );
}

