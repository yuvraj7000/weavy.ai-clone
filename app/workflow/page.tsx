"use client";

import { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import TextNode from "@/components/nodes/TextNode";
import ImageNode from "@/components/nodes/ImageNode";
import LLMNode from "@/components/nodes/LLMNode";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  llm: LLMNode,
};

const edgeOptions = {
  animated: true,
  style: { stroke: "#9333ea" }, // Purple color
};

function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useWorkflowStore();


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace to delete selected nodes
      if ((e.key === "Delete" || e.key === "Backspace") && e.target === document.body) {
        const selectedNodes = nodes.filter((n) => n.selected);
        selectedNodes.forEach((node) => {
          useWorkflowStore.getState().deleteNode(node.id);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        attributionPosition="bottom-left"
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor="#9333ea"
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex h-screen w-full bg-gray-100">
      <ReactFlowProvider>
        <Sidebar />
        <div className="flex-1 relative">
          <WorkflowCanvas />
          <Toolbar reactFlowInstance={null} />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
