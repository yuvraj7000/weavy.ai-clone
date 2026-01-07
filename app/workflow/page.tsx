"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
  Connection,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import { useToast } from "@/components/Toast";
import Sidebar, { SecondarySidebar, SidebarProvider, useSidebarContext } from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import TextNode from "@/components/nodes/TextNode";
import ImageNode from "@/components/nodes/ImageNode";
import LLMNode from "@/components/nodes/LLMNode";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  llm: LLMNode,
};

// Connection type colors
const CONNECTION_COLORS = {
  prompt: "#FFA500", // Orange for prompt connections
  result: "#FFA500", // Orange for result->input connections
  image: "#a855f7", // Purple for image connections
  systemPrompt: "#FFA500", // Orange for system prompt connections
};

function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setEdges,
    addNode,
  } = useWorkflowStore();
  const { showToast } = useToast();
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);
  const hasInitialized = React.useRef(false);
  const isMounted = React.useRef(false);

  // Initialize default nodes on first load (client-side only)
  useEffect(() => {
    // Mark as mounted on client side
    isMounted.current = true;
    
    if (!hasInitialized.current && nodes.length === 0) {
      // Use a stable timestamp to avoid hydration issues
      const timestamp = Date.now();
      const defaultNodes = [
        {
          id: `text-${timestamp}`,
          type: "text",
          position: { x: 300, y: 200 },
          data: { text: "" },
        },
        {
          id: `image-${timestamp + 1}`,
          type: "image",
          position: { x: 350, y: 900 },
          data: {},
        },
        {
          id: `llm-${timestamp + 2}`,
          type: "llm",
          position: { x: 900, y: 200 },
          data: {
            model: "gemini-2.5-flash",
            output: "",
          },
        },
      ];
      
      defaultNodes.forEach((node) => {
        addNode(node);
      });
      
      hasInitialized.current = true;
    }
  }, [nodes.length, addNode]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent deletion when typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      const isInputElement = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]');

      // Delete/Backspace to delete selected nodes and edges
      if ((e.key === "Delete" || e.key === "Backspace") && !isInputElement) {
        e.preventDefault();
        
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((edge) => edge.selected);
        
        // Delete selected nodes
        if (selectedNodes.length > 0) {
          selectedNodes.forEach((node) => {
            useWorkflowStore.getState().deleteNode(node.id);
          });
        }
        
        // Delete selected edges
        if (selectedEdges.length > 0) {
          const updatedEdges = edges.filter((edge) => !edge.selected);
          setEdges(updatedEdges);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, edges, setEdges]);

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

  // Validate connections and set colors
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;

      // Connection validation rules
      let isValid = false;
      let connectionType: "prompt" | "result" | "image" | "systemPrompt" | null = null;

      // System Prompt -> System Prompt (text node output to LLM system prompt input)
      if (sourceHandle === "prompt" && targetHandle === "systemPrompt") {
        if (sourceNode.type === "text" && targetNode.type === "llm") {
          const existingPromptConnection = edges.find(
            (e) => e.source === connection.source && e.target === connection.target && e.targetHandle === "prompt"
          );
          if (existingPromptConnection) {
            showToast("Cannot connect the same Text node to both System Prompt and Prompt of the same LLM node!", "error");
            return;
          }
          isValid = true;
          connectionType = "systemPrompt";
        }
      }
      // Prompt -> Prompt (text node output to LLM prompt input)
      else if (sourceHandle === "prompt" && targetHandle === "prompt") {
        if (sourceNode.type === "text" && targetNode.type === "llm") {
          const existingSystemPromptConnection = edges.find(
            (e) => e.source === connection.source && e.target === connection.target && e.targetHandle === "systemPrompt"
          );
          if (existingSystemPromptConnection) {
            showToast("Cannot connect the same Text node to both System Prompt and Prompt of the same LLM node!", "error");
            return;
          }
          isValid = true;
          connectionType = "prompt";
        }
      }
      // Result -> System Prompt (LLM result to LLM system prompt input)
      else if (sourceHandle === "result" && targetHandle === "systemPrompt") {
        if (sourceNode.type === "llm" && targetNode.type === "llm") {
          const existingPromptConnection = edges.find(
            (e) => e.source === connection.source && e.target === connection.target && e.targetHandle === "prompt"
          );
          if (existingPromptConnection) {
            showToast("Cannot connect the same LLM node to both System Prompt and Prompt of the same LLM node!", "error");
            return;
          }
          isValid = true;
          connectionType = "systemPrompt";
        }
      }
      // Result -> Prompt (LLM result to LLM prompt input)
      else if (sourceHandle === "result" && targetHandle === "prompt") {
        if (sourceNode.type === "llm" && targetNode.type === "llm") {
          const existingSystemPromptConnection = edges.find(
            (e) => e.source === connection.source && e.target === connection.target && e.targetHandle === "systemPrompt"
          );
          if (existingSystemPromptConnection) {
            showToast("Cannot connect the same LLM node to both System Prompt and Prompt of the same LLM node!", "error");
            return;
          }
          isValid = true;
          connectionType = "prompt";
        }
      }
      // Result -> Input (LLM result to text node input)
      else if (sourceHandle === "result" && targetHandle === "input") {
        if (sourceNode.type === "llm" && targetNode.type === "text") {
          isValid = true;
          connectionType = "result";
        }
      }
      // Image -> Image (image node output to LLM image input)
      else if (sourceHandle === "image" && targetHandle === "image") {
        if (sourceNode.type === "image" && targetNode.type === "llm") {
          isValid = true;
          connectionType = "image";
        }
      }

      if (isValid && connectionType) {
        const newEdge = {
          ...connection,
          style: { stroke: CONNECTION_COLORS[connectionType] },
          animated: true,
        };
        const updatedEdges = addEdge(newEdge, edges);
        setEdges(updatedEdges);
        showToast("Connection created successfully!", "success");
      } else {
        showToast("Invalid connection! Use: prompt->prompt, prompt->systemPrompt, result->prompt, result->systemPrompt, result->input, or image->image", "error");
      }
    },
    [nodes, edges, setEdges, showToast]
  );

  return (
    <div className="w-full h-full bg-[#0a0a0a]" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ animated: true }}
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
        <Controls 
          position="bottom-center" 
          className="-translate-x-1/4" 
          style={{ display: 'flex', flexDirection: 'row' }}
        />
            <MiniMap
              nodeColor="#a855f7"
              maskColor="rgba(168, 85, 247, 0.3)"
              position="bottom-right"
              style={{
                backgroundColor: '#1a0a2e',
                border: '1px solid #a855f7',
              }}
            />
      </ReactFlow>
    </div>
  );
}

function WorkflowCanvasWrapper() {
  const { activeSection } = useSidebarContext();
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(workflowName || "Untitled Workflow");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(workflowName || "Untitled Workflow");
  }, [workflowName]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue) {
      setWorkflowName(trimmedValue);
    } else {
      setEditValue(workflowName || "Untitled Workflow");
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(workflowName || "Untitled Workflow");
      setIsEditing(false);
    }
  };

  return (
    <div className="flex-1 relative">
      {/* Workflow Name - shown when sidebar is closed */}
      {!activeSection && (
        <div className="absolute top-0 left-0 z-40 py-4 h-18 flex items-center justify-center text-sm font-semibold text-gray-300 w-64 text-center">
          <div className="px-4 py-2 bg-[#1a1a1a] border border-[#302e33] rounded-md">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none text-sm font-semibold text-gray-300 w-full text-center focus:outline-none"
              />
            ) : (
              <span
                onDoubleClick={handleDoubleClick}
                className="cursor-text select-none"
                title="Double-click to edit"
              >
                {workflowName || "Untitled Workflow"}
              </span>
            )}
          </div>
        </div>
      )}
      <WorkflowCanvas />
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
            <Toolbar />
            <div className="flex-1 relative flex flex-col">
              <SecondarySidebar />
              <WorkflowCanvasWrapper />
            </div>
          </div>
        </SidebarProvider>
      </ReactFlowProvider>
    </div>
  );
}
