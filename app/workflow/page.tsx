"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import Sidebar, { SecondarySidebar, SidebarProvider } from "@/components/Sidebar";
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
  style: { stroke: "#22c55e" }, // Green color to match Weavy.ai
};

function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
  } = useWorkflowStore();
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);

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

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");

      if (typeof data === "undefined" || !data) {
        return;
      }

      try {
        const nodeData = JSON.parse(data);
        const type = nodeData.type;

        if (typeof type === "undefined" || !type) {
          return;
        }

        if (reactFlowBounds && reactFlowInstance) {
          const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });

          let newNode;
          if (type === "text") {
            newNode = {
              id: `text-${Date.now()}`,
              type: "text",
              position,
              data: { text: "" },
            };
          } else if (type === "image") {
            newNode = {
              id: `image-${Date.now()}`,
              type: "image",
              position,
              data: {},
            };
          } else if (type === "llm") {
            newNode = {
              id: `llm-${Date.now()}`,
              type: "llm",
              position,
              data: {
                model: "gemini-2.5-flash",
                systemPrompt: "",
                userMessage: "",
                output: "",
              },
            };
          } else {
            return;
          }

          addNode(newNode);
        }
      } catch (error) {
        console.error("Error parsing drag data:", error);
      }
    },
    [reactFlowInstance, addNode]
  );

  return (
    <div className="w-full h-full bg-[#0a0a0a]" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        attributionPosition="bottom-left"
      >
        <Background 
          variant={BackgroundVariant.Dots}
          gap={30} 
          size={0.8} 
          color="#ced9d8"
          style={{ backgroundColor: "#0E0E13" }}
        />
        <Controls />
        <MiniMap
          nodeColor="#22c55e"
          maskColor="rgba(0, 0, 0, 0.5)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a]">
      <ReactFlowProvider>
        <SidebarProvider>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex-1 relative flex flex-col">
              <SecondarySidebar />
              <div className="flex-1 relative">
                <WorkflowCanvas />
                <Toolbar reactFlowInstance={null} />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </ReactFlowProvider>
    </div>
  );
}
