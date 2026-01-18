"use client";

import React, { useCallback, useState, createContext, useContext, useEffect } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Type, Image as ImageIcon, Sparkles, Search, Zap, FolderOpen, Trash2, ArrowRight, Video, Crop, Film } from "lucide-react";
import Image from "next/image";
const SidebarContext = createContext<{
  activeSection: "search" | "quick-access" | "workflows" | null;
  setActiveSection: (section: "search" | "quick-access" | "workflows" | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
} | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
}

export { SidebarProvider };

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<"search" | "quick-access" | "workflows" | null>("workflows");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <SidebarContext.Provider value={{ activeSection, setActiveSection, searchQuery, setSearchQuery }}>
      {children}
    </SidebarContext.Provider>
  );
}

function PrimarySidebar() {
  const context = useSidebarContext();
  const { activeSection, setActiveSection } = context;
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { showToast } = useToast();
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow);

  const toggleSection = (section: "search" | "quick-access" | "workflows") => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleDeleteWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        clearWorkflow();
        showToast("Workflow deleted successfully!", "success");
      } else {
        showToast(`Error: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      showToast("Failed to delete workflow", "error");
    }
  }, [workflowId, clearWorkflow, showToast]);

  return (
    <>
      <div className="w-16 bg-[#212126] border-r border-[#302e33] flex flex-col items-center py-4">
        <span className="w-12 h-12 flex items-center justify-center rounded-lg mb-6">
          <Link href="/">
            <Image src="/weavy.svg" alt="Weavy" width={40} height={40} />
          </Link>
        </span>
        <button
          onClick={() => toggleSection("search")}
          className={`w-12 h-12 flex items-center justify-center rounded-lg mb-2 transition-colors ${
            activeSection === "search"
              ? "bg-[#FAFFC7] text-black"
              : "text-gray-400 hover:bg-[#353539] hover:text-gray-300"
          }`}
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => toggleSection("quick-access")}
          className={`w-12 h-12 flex items-center justify-center rounded-lg mb-2 transition-colors ${
            activeSection === "quick-access"
              ? "bg-[#FAFFC7] text-black"
              : "text-gray-400 hover:bg-[#353539] hover:text-gray-300"
          }`}
          title="Quick Access"
        >
          <Zap className="w-5 h-5" />
        </button>

        <button
          onClick={() => toggleSection("workflows")}
          className={`w-12 h-12 flex items-center justify-center rounded-lg mb-auto transition-colors ${
            activeSection === "workflows"
              ? "bg-[#FAFFC7] text-black"
              : "text-gray-400 hover:bg-[#353539] hover:text-gray-300"
          }`}
          title="Load Workflow"
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        {/* Delete Workflow Button - only visible if workflowId exists */}
        {workflowId && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-12 h-12 flex items-center justify-center rounded-lg mt-auto transition-colors text-red-400 hover:bg-red-900/20 hover:text-red-300"
            title="Delete Workflow"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Delete Workflow Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteWorkflow}
        title="Delete Workflow"
        message="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />
    </>
  );
}

export default function Sidebar() {
  return <PrimarySidebar />;
}

export function SecondarySidebar() {
  const context = useSidebarContext();
  const { activeSection, setActiveSection, searchQuery, setSearchQuery } = context;
  const addNode = useWorkflowStore((state) => state.addNode);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; createdAt?: string; updatedAt?: string }>>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(workflowName || "Untitled Workflow");
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditNameValue(workflowName || "Untitled Workflow");
  }, [workflowName]);

  React.useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameDoubleClick = () => {
    setIsEditingName(true);
  };

  const handleNameBlur = () => {
    const trimmedValue = editNameValue.trim();
    if (trimmedValue) {
      setWorkflowName(trimmedValue);
    } else {
      setEditNameValue(workflowName || "Untitled Workflow");
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameBlur();
    } else if (e.key === "Escape") {
      setEditNameValue(workflowName || "Untitled Workflow");
      setIsEditingName(false);
    }
  };
  const { showToast } = useToast();

  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch("/api/workflows");
      const result = await response.json();

      if (result.success && result.data) {
        setWorkflows(result.data);
      } else {
        setWorkflows([]);
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
      setWorkflows([]);
    } finally {
      setLoadingWorkflows(false);
    }
  }, []);

  // Fetch workflows when workflows section is opened
  useEffect(() => {
    if (activeSection === "workflows") {
      fetchWorkflows();
    }
  }, [activeSection, fetchWorkflows]);

  const handleLoadWorkflowClick = useCallback(async (workflowId: string) => {
    setLoadingWorkflow(workflowId);
    try {
      const response = await fetch("/api/workflows");
      const result = await response.json();

      if (result.success && result.data) {
        const workflow = result.data.find((w: { id: string }) => w.id === workflowId);
        if (workflow) {
          loadWorkflow(workflow.nodes, workflow.edges, workflow.name, workflow.id);
          showToast("Workflow loaded successfully!", "success");
          setActiveSection(null); // Close sidebar after loading
        } else {
          showToast("Workflow not found", "error");
        }
      } else {
        showToast("No workflows found", "error");
      }
    } catch (error) {
      console.error("Error loading workflow:", error);
      showToast("Failed to load workflow", "error");
    } finally {
      setLoadingWorkflow(null);
    }
  }, [loadWorkflow, setActiveSection, showToast]);

  const createTextNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `text-${Date.now()}`,
      type: "text",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { text: "" },
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const createImageNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `image-${Date.now()}`,
      type: "image",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {},
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const createLLMNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `llm-${Date.now()}`,
      type: "llm",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        output: "",
      },
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const createVideoNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `video-${Date.now()}`,
      type: "video",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {},
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const createCropImageNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `cropImage-${Date.now()}`,
      type: "cropImage",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
      },
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const createExtractFrameNode = useCallback((position?: { x: number; y: number }) => {
    const newNode = {
      id: `extractFrame-${Date.now()}`,
      type: "extractFrame",
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        timestamp: "50%",
      },
    };
    addNode(newNode);
    // Don't close sidebar when adding node
  }, [addNode]);

  const nodeButtons = [
    { icon: Type, label: "Text Node", onClick: createTextNode, type: "text" },
    { icon: ImageIcon, label: "Upload Image Node", onClick: createImageNode, type: "image" },
    { icon: Video, label: "Upload Video Node", onClick: createVideoNode, type: "video" },
    { icon: Sparkles, label: "Run Any LLM Node", onClick: createLLMNode, type: "llm" },
    { icon: Crop, label: "Crop Image Node", onClick: createCropImageNode, type: "cropImage" },
    { icon: Film, label: "Extract Frame from Video Node", onClick: createExtractFrameNode, type: "extractFrame" },
  ];

  const filteredNodes = nodeButtons.filter((node) =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`absolute top-0 left-0 z-50 bg-[#212126] border-r border-b border-[#302e33] flex flex-col h-full overflow-hidden shadow-lg transition-all duration-300 ease-in-out ${
        activeSection
          ? "w-64 opacity-100 translate-x-0"
          : "w-0 opacity-0 -translate-x-4 pointer-events-none"
      }`}
    >
      <div className={`py-4 h-18 flex items-center justify-center text-sm font-semibold text-gray-300 w-full text-center border-b border-[#302e33] transition-opacity duration-200 ease-in-out ${
        activeSection ? "opacity-100 delay-100" : "opacity-0 delay-0"
      }`}>
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editNameValue}
            onChange={(e) => setEditNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="bg-[#1a1a1a] border border-[#302e33] rounded-md px-4 py-2 text-sm font-semibold text-gray-300 text-center focus:outline-none focus:border-[#7a7a7d] w-[90%]"
          />
        ) : (
          <span
            onDoubleClick={handleNameDoubleClick}
            className="cursor-text select-none px-4 py-2"
            title="Double-click to edit"
          >
            {workflowName || "Untitled Workflow"}
          </span>
        )}
      </div>
      <div className={`min-w-64 transition-all duration-200 ease-in-out ${
        activeSection ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-2 delay-0"
      }`}>
        {activeSection === "search" && (
          <>
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Search</h2>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full pl-8 pr-3 py-2 bg-[#1a1a1a] border border-[#302e33] rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#7a7a7d]"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 max-h-[300px]">
              <div className="space-y-2">
                {(searchQuery ? filteredNodes : nodeButtons).length > 0 ? (
                  (searchQuery ? filteredNodes : nodeButtons).map((node, index) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: node.type }));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <button
                          onClick={() => node.onClick()}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#212126] border border-[#454549] rounded hover:bg-[#353539] transition-colors text-left"
                        >
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-300">{node.label}</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No nodes found
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "quick-access" && (
          <>
            <div className="p-4 ">
              <h2 className="text-sm font-semibold text-gray-300">Quick access</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 max-h-[500px]">
              <div className="grid grid-cols-2 gap-2">
                {nodeButtons.map((node, index) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: node.type }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <button
                        onClick={() => node.onClick()}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-[#212126] border border-[#454549] rounded hover:bg-[#353539] transition-colors aspect-square w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        title={node.label}
                      >
                        <Icon className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-300 text-center">{node.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeSection === "workflows" && (
          <>
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-300 "> Use Workflows</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingWorkflows ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  Loading workflows...
                </div>
              ) : workflows.length > 0 ? (
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleLoadWorkflowClick(workflow.id)}
                      disabled={loadingWorkflow === workflow.id}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#212126] border border-[#454549] rounded hover:bg-[#353539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left group"
                    >
                      <div className="flex flex-col items-start gap-1 flex-1">
                        <span className="text-sm text-gray-300 font-medium">{workflow.name}</span>
                        {workflow.updatedAt && (
                          <span className="text-xs text-gray-500">
                            Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {loadingWorkflow === workflow.id ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No workflows found
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
