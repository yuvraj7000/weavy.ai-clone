"use client";

import { useCallback, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useToast } from "@/components/Toast";
import { useUser } from "@clerk/nextjs";
import Modal from "@/components/Modal";
import {
  Undo2,
  Redo2,
  Save,
  FilePlus,
  Download,
  Upload,
  X,
} from "lucide-react";

export default function Toolbar() {
  const { user } = useUser();
  const currentUserId = user?.id || null;
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const {
    nodes,
    edges,
    workflowName: currentWorkflowName,
    workflowId,
    workflowUserId,
    undo,
    redo,
    canUndo,
    canRedo,
    loadWorkflow,
    clearWorkflow,
    setWorkflowUserId,
  } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if user can edit (must be owner)
  const canEdit = !workflowId || (currentUserId && workflowUserId === currentUserId);

  const handleExport = useCallback(() => {
    try {
      const data = { nodes, edges };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Workflow exported successfully!", "success");
    } catch (error) {
      console.error("Error exporting workflow:", error);
      showToast("Failed to export workflow", "error");
    }
  }, [nodes, edges, showToast]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.nodes && data.edges) {
            loadWorkflow(data.nodes, data.edges, data.name || "");
            showToast("Workflow imported successfully!", "success");
          } else {
            showToast("Invalid workflow file", "error");
          }
        } catch (error) {
          console.error("Error importing workflow:", error);
          showToast("Failed to import workflow", "error");
        }
      };
      reader.readAsText(file);
    },
    [loadWorkflow, showToast]
  );

  const handleSaveClick = useCallback(() => {
    // Check if user can edit this workflow
    if (workflowId && !canEdit) {
      showToast("This is a public workflow. You don't have access to edit it. Only its owner can edit it.", "error");
      return;
    }
    // If workflow name exists, just show confirmation modal
    // Otherwise, show input modal
    setShowSaveModal(true);
  }, [workflowId, canEdit, showToast]);

  const handleSaveConfirm = useCallback(async () => {
    // Check if user can edit this workflow before proceeding
    if (workflowId && !canEdit) {
      showToast("This is a public workflow. You don't have access to edit it. Only its owner can edit it.", "error");
      setShowSaveModal(false);
      return;
    }

    // Use current workflow name if it exists, otherwise use input value
    const nameToSave = currentWorkflowName || workflowName.trim();
    
    if (!nameToSave) {
      showToast("Please enter a workflow name", "error");
      return;
    }

    setIsSaving(true);
    try {
      const imageNodes = nodes.filter(
        (node) => node.type === "image" && node.data?.imageBase64 && !node.data?.imageUrl
      );

      const videoNodes = nodes.filter(
        (node) => node.type === "video" && node.data?.videoBase64 && !node.data?.videoUrl
      );

      const updatedNodes = [...nodes];
      
      // Upload images
      for (const imageNode of imageNodes) {
        try {
          const base64Data = imageNode.data.imageBase64 as string;
          const base64WithoutPrefix = base64Data.includes(",")
            ? base64Data.split(",")[1]
            : base64Data;

          const formData = new FormData();
          formData.append("base64", base64WithoutPrefix);
          formData.append("type", "image");

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const uploadResult = await uploadResponse.json();

          if (uploadResult.success) {
            const nodeIndex = updatedNodes.findIndex((n) => n.id === imageNode.id);
            if (nodeIndex !== -1) {
              updatedNodes[nodeIndex] = {
                ...updatedNodes[nodeIndex],
                data: {
                  ...updatedNodes[nodeIndex].data,
                  imageUrl: uploadResult.data.url,
                  imageBase64: undefined,
                },
              };
            }
          } else {
            showToast(`Failed to upload image: ${uploadResult.error}`, "error");
          }
        } catch (error) {
          console.error(`Error uploading image for node ${imageNode.id}:`, error);
          showToast("Failed to upload image", "error");
        }
      }

      // Upload videos
      for (const videoNode of videoNodes) {
        try {
          const base64Data = videoNode.data.videoBase64 as string;
          const base64WithoutPrefix = base64Data.includes(",")
            ? base64Data.split(",")[1]
            : base64Data;

          const formData = new FormData();
          formData.append("base64", base64WithoutPrefix);
          formData.append("type", "video");

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const uploadResult = await uploadResponse.json();

          if (uploadResult.success) {
            const nodeIndex = updatedNodes.findIndex((n) => n.id === videoNode.id);
            if (nodeIndex !== -1) {
              updatedNodes[nodeIndex] = {
                ...updatedNodes[nodeIndex],
                data: {
                  ...updatedNodes[nodeIndex].data,
                  videoUrl: uploadResult.data.url,
                  videoBase64: undefined,
                },
              };
            }
          } else {
            showToast(`Failed to upload video: ${uploadResult.error}`, "error");
          }
        } catch (error) {
          console.error(`Error uploading video for node ${videoNode.id}:`, error);
          showToast("Failed to upload video", "error");
        }
      }

      // Update store with uploaded URLs
      updatedNodes.forEach((node) => {
        if (node.type === "image" && node.data?.imageUrl) {
          useWorkflowStore.getState().updateNodeData(node.id, {
            imageUrl: node.data.imageUrl,
            imageBase64: undefined,
          });
        }
        if (node.type === "video" && node.data?.videoUrl) {
          useWorkflowStore.getState().updateNodeData(node.id, {
            videoUrl: node.data.videoUrl,
            videoBase64: undefined,
          });
        }
      });

      // Use PUT to update if workflowId exists, otherwise POST to create new
      const method = workflowId ? "PUT" : "POST";
      const url = workflowId ? `/api/workflows?id=${workflowId}` : "/api/workflows";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workflowId || undefined,
          name: nameToSave,
          nodes: updatedNodes,
          edges,
          isPublic,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const savedWorkflowId = result.data?.id || workflowId;
        useWorkflowStore.getState().setWorkflowName(nameToSave);
        // Update workflowId if it was a new workflow
        if (result.data?.id && !workflowId) {
          useWorkflowStore.getState().setWorkflowId(result.data.id);
        }
        // Update workflowUserId to track ownership
        if (currentUserId) {
          useWorkflowStore.getState().setWorkflowUserId(currentUserId);
        }
        
        // Emit workflow save event for RightSidebar
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("workflow-saved", { 
            detail: { workflowName: nameToSave, workflowId: savedWorkflowId } 
          }));
        }
        
        showToast(workflowId ? "Workflow updated successfully!" : "Workflow saved successfully!", "success");
        setWorkflowName("");
        setIsPublic(false);
      } else {
        // Check if it's an authorization error
        if (result.error && (result.error.includes("edit") || result.error.includes("owner") || result.error.includes("403"))) {
          showToast("This is a public workflow. You don't have access to edit it. Only its owner can edit it.", "error");
        } else {
          showToast(`Error: ${result.error}`, "error");
        }
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      showToast("Failed to save workflow", "error");
    } finally {
      setIsSaving(false);
      setShowSaveModal(false);
      setWorkflowName("");
      setIsPublic(false);
    }
  }, [nodes, edges, workflowName, workflowId, currentWorkflowName, isPublic, currentUserId, canEdit, showToast]);


  const handleNewWorkflowClick = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleNewWorkflowConfirm = useCallback(() => {
    clearWorkflow();
    showToast("New workflow created successfully!", "success");
  }, [clearWorkflow, showToast]);

  return (
    <>
      {/* Top Center: Save, Load, Delete, Undo, Redo, Export, Import */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#353539] border border-[#5C5C5F] rounded-lg shadow-lg p-1.5">
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title={!canEdit ? "You can only edit your own workflows" : "Save Workflow"}
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={handleNewWorkflowClick}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title="New Workflow"
        >
          <FilePlus className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-[#5C5C5F]" />
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-[#5C5C5F]" />
        <button
          onClick={handleExport}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title="Export JSON"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1.5 hover:bg-[#3d3d42] rounded text-white text-sm transition-colors border border-transparent hover:border-[#5C5C5F]"
          title="Import JSON"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowSaveModal(false);
                  setWorkflowName("");
                }}
              />
              <div className="relative z-10 bg-[#212126] border border-[#302e33] rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-4 border-b border-[#302e33]">
                  <h2 className="text-lg font-semibold text-gray-300">Save Workflow</h2>
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setWorkflowName("");
                    }}
                    className="p-1 rounded hover:bg-[#353539] text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    {currentWorkflowName ? (
                      <p className="text-lg font-semibold text-gray-300 mb-3">Name: {currentWorkflowName}</p>
                    ) : (
                      <>
                      <p className="text-sm text-gray-400 mb-3">Enter a name for your workflow:</p>
                      <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="Workflow name"
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#302e33] rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#7a7a7d]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && workflowName.trim()) {
                          handleSaveConfirm();
                          setShowSaveModal(false);
                        }
                      }}
                    />
                    </>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300 mb-1">Visibility</p>
                      <p className="text-xs text-gray-500">
                        {isPublic 
                          ? "Anyone can view this workflow" 
                          : "Only you can view this workflow"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isPublic ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isPublic ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={isPublic ? "text-blue-400" : "text-gray-500"}>
                      {isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-4 border-t border-[#302e33]">
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setWorkflowName("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#353539] border border-[#454549] rounded hover:bg-[#3d3d42] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleSaveConfirm();
                      setShowSaveModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
        </>
      )}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleNewWorkflowConfirm}
        title="New Workflow"
        message="Are you sure you want to create a new workflow? The current workflow will be cleared."
        confirmText="Create New"
        cancelText="Cancel"
        confirmButtonColor="bg-blue-600 hover:bg-blue-700"
      />
    </>
  );
}

