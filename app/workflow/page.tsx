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
import Modal from "@/components/Modal";
import Sidebar, { SecondarySidebar, SidebarProvider, useSidebarContext } from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import TextNode from "@/components/nodes/TextNode";
import ImageNode from "@/components/nodes/ImageNode";
import LLMNode from "@/components/nodes/LLMNode";
import VideoNode from "@/components/nodes/VideoNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  llm: LLMNode,
  video: VideoNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

// Connection type colors
const CONNECTION_COLORS = {
  prompt: "#FFA500", // Orange for prompt connections
  result: "#FFA500", // Orange for result->input connections
  image: "#a855f7", // Purple for image connections
  video: "#a855f7", // Purple for video connections
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
  const [showDeleteNodeModal, setShowDeleteNodeModal] = React.useState(false);
  const [nodesToDelete, setNodesToDelete] = React.useState<string[]>([]);
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
        
        // Delete selected nodes with confirmation
        if (selectedNodes.length > 0) {
          setNodesToDelete(selectedNodes.map((n) => n.id));
          setShowDeleteNodeModal(true);
        }
        
        // Delete selected edges (no confirmation needed)
        if (selectedEdges.length > 0) {
          const updatedEdges = edges.filter((edge) => !edge.selected);
          setEdges(updatedEdges);
          showToast(`${selectedEdges.length} connection(s) deleted`, "success");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, edges, setEdges, showToast]);

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
          } else if (type === "video") {
            newNode = {
              id: `video-${Date.now()}`,
              type: "video",
              position,
              data: {},
            };
          } else if (type === "cropImage") {
            newNode = {
              id: `cropImage-${Date.now()}`,
              type: "cropImage",
              position,
              data: {
                xPercent: 0,
                yPercent: 0,
                widthPercent: 100,
                heightPercent: 100,
              },
            };
          } else if (type === "extractFrame") {
            newNode = {
              id: `extractFrame-${Date.now()}`,
              type: "extractFrame",
              position,
              data: {
                timestamp: "50%",
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

  // Check for circular dependency using DFS
  const hasCircularDependency = React.useCallback(
    (sourceId: string, targetId: string, currentEdges: typeof edges): boolean => {
      const adjacencyList = new Map<string, string[]>();

      nodes.forEach((node) => {
        adjacencyList.set(node.id, []);
      });

      currentEdges.forEach((edge) => {
        if (edge.source && edge.target) {
          const neighbors = adjacencyList.get(edge.source) || [];
          neighbors.push(edge.target);
          adjacencyList.set(edge.source, neighbors);
        }
      });

      // Add the new connection we're trying to make
      const neighbors = adjacencyList.get(sourceId) || [];
      neighbors.push(targetId);
      adjacencyList.set(sourceId, neighbors);
      
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const dfs = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) {
          // Found a cycle
          return true;
        }
        
        if (visited.has(nodeId)) {
          return false;
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (dfs(neighbor)) {
            return true;
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      };
      
      // Check all nodes for cycles
      for (const nodeId of adjacencyList.keys()) {
        if (!visited.has(nodeId)) {
          if (dfs(nodeId)) {
            return true;
          }
        }
      }
      
      return false;
    },
    [nodes]
  );

  // Validate entire graph is a DAG (for execution validation) - Reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateGraphIsDAG = React.useCallback((): { isValid: boolean; error?: string } => {
    const adjacencyList = new Map<string, string[]>();

    nodes.forEach((node) => {
      adjacencyList.set(node.id, []);
    });

    edges.forEach((edge) => {
      if (edge.source && edge.target) {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
      }
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Found a cycle
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check all nodes for cycles
    for (const nodeId of adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          return { isValid: false, error: "Workflow contains circular dependencies. Please remove cycles before execution." };
        }
      }
    }
    
    return { isValid: true };
  }, [nodes, edges]);

  // Validate connections and set colors
  const handleConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      if (connection.source === connection.target) {
        showToast("Cannot connect a node to itself!", "error");
        return;
      }

      // Check for duplicate connections
      const duplicateConnection = edges.find(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle
      );
      if (duplicateConnection) {
        showToast("This connection already exists!", "error");
        return;
      }

      const sourceHandle = connection.sourceHandle;
      const targetHandle = connection.targetHandle;

      // Connection validation rules
      let isValid = false;
      let connectionType: "prompt" | "result" | "image" | "video" | "systemPrompt" | null = null;

      // ========== TEXT NODE CONNECTIONS ==========
      // Text -> LLM System Prompt
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
      // Text -> LLM Prompt
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
      // LLM Result -> Text Input
      else if (sourceHandle === "result" && targetHandle === "input") {
        if (sourceNode.type === "llm" && targetNode.type === "text") {
          isValid = true;
          connectionType = "result";
        }
      }
      // LLM Result -> LLM System Prompt
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
      // LLM Result -> LLM Prompt
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

      // ========== IMAGE NODE CONNECTIONS ==========
      // Image connections: image/image handles
      else if (sourceHandle === "image" && targetHandle === "image") {
        // Image -> LLM Image Input
        if (sourceNode.type === "image" && targetNode.type === "llm") {
          isValid = true;
          connectionType = "image";
        }
        // Image -> CropImage Image Input (only one image node allowed)
        else if (sourceNode.type === "image" && targetNode.type === "cropImage") {
          // Check if there's already an image node connected to this cropImage node
          const existingImageConnection = edges.find(
            (e) => e.target === connection.target && e.targetHandle === "image"
          );
          if (existingImageConnection) {
            const existingSourceNode = nodes.find((n) => n.id === existingImageConnection.source);
            if (existingSourceNode?.type === "image") {
              showToast("Only one image node can be connected to a crop node!", "error");
              return;
            }
          }
          isValid = true;
          connectionType = "image";
        }
        // CropImage -> LLM Image Input
        else if (sourceNode.type === "cropImage" && targetNode.type === "llm") {
          isValid = true;
          connectionType = "image";
        }
        // CropImage -> CropImage (chained cropping)
        else if (sourceNode.type === "cropImage" && targetNode.type === "cropImage") {
          isValid = true;
          connectionType = "image";
        }
        // ExtractFrame -> LLM Image Input
        else if (sourceNode.type === "extractFrame" && targetNode.type === "llm") {
          isValid = true;
          connectionType = "image";
        }
        // ExtractFrame -> CropImage Image Input
        else if (sourceNode.type === "extractFrame" && targetNode.type === "cropImage") {
          isValid = true;
          connectionType = "image";
        }
      }

      // ========== VIDEO NODE CONNECTIONS ==========
      // Video -> ExtractFrame Video Input (only one video node allowed)
      else if (sourceHandle === "video" && targetHandle === "video") {
        if (sourceNode.type === "video" && targetNode.type === "extractFrame") {
          // Check if there's already a video node connected to this extractFrame node
          const existingVideoConnection = edges.find(
            (e) => e.target === connection.target && e.targetHandle === "video"
          );
          if (existingVideoConnection) {
            const existingSourceNode = nodes.find((n) => n.id === existingVideoConnection.source);
            if (existingSourceNode?.type === "video") {
              showToast("Only one video node can be connected to a frame extractor node!", "error");
              return;
            }
          }
          isValid = true;
          connectionType = "video";
        }
      }

      if (isValid && connectionType) {
        if (hasCircularDependency(connection.source, connection.target, edges)) {
          showToast("Circular dependency detected! This connection would create a cycle.", "error");
          return;
        }
        
        const newEdge = {
          ...connection,
          style: { stroke: CONNECTION_COLORS[connectionType] },
          animated: true,
        };
        const updatedEdges = addEdge(newEdge, edges);
        setEdges(updatedEdges);
      } else {
        // Provide helpful error message based on node types
        let errorMsg = "Invalid connection! ";
        if (sourceNode.type === "text") {
          errorMsg += "Text nodes can connect to LLM nodes (prompt/systemPrompt handles).";
        } else if (sourceNode.type === "image" || sourceNode.type === "cropImage" || sourceNode.type === "extractFrame") {
          errorMsg += "Image nodes can connect to LLM or CropImage nodes (image handles).";
        } else if (sourceNode.type === "video") {
          errorMsg += "Video nodes can connect to ExtractFrame nodes (video handles).";
        } else if (sourceNode.type === "llm") {
          errorMsg += "LLM nodes can connect to Text nodes (result->input) or other LLM nodes (result->prompt/systemPrompt).";
        } else {
          errorMsg += "Please check handle compatibility between source and target nodes.";
        }
        showToast(errorMsg, "error");
      }
    },
    [nodes, edges, setEdges, showToast, hasCircularDependency]
  );

  const handleDeleteNodesConfirm = React.useCallback(() => {
    const count = nodesToDelete.length;
    nodesToDelete.forEach((nodeId) => {
      useWorkflowStore.getState().deleteNode(nodeId);
    });
    showToast(`${count} node(s) deleted successfully`, "success");
    setNodesToDelete([]);
    setShowDeleteNodeModal(false);
  }, [nodesToDelete, showToast]);

  return (
    <>
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

      {/* Delete Nodes Confirmation Modal */}
      <Modal
        isOpen={showDeleteNodeModal}
        onClose={() => {
          setShowDeleteNodeModal(false);
          setNodesToDelete([]);
        }}
        onConfirm={handleDeleteNodesConfirm}
        title="Delete Nodes"
        message={`Are you sure you want to delete ${nodesToDelete.length} selected node(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />
    </>
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
