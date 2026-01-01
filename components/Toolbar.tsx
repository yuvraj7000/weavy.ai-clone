"use client";

import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
interface ToolbarProps {
  reactFlowInstance?: unknown;
}

export default function Toolbar({ reactFlowInstance: _ }: ToolbarProps) {
  const {
    nodes,
    edges,
    undo,
    redo,
    canUndo,
    canRedo,
    loadWorkflow,
    clearWorkflow,
  } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    const name = prompt("Enter workflow name:");
    if (!name) return;

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          nodes,
          edges,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Workflow saved successfully!");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      alert("Failed to save workflow");
    }
  }, [nodes, edges]);

  const handleLoad = useCallback(async () => {
    try {
      const response = await fetch("/api/workflows");
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const workflowNames = result.data.map(
          (w: any) => `${w.id} - ${w.name}`
        );
        const selected = prompt(
          `Enter workflow ID to load:\n\n${workflowNames.join("\n")}`
        );
        if (!selected) return;

        const workflow = result.data.find(
          (w: any) => w.id === selected || w.id === selected.split(" - ")[0]
        );

        if (workflow) {
          loadWorkflow(workflow.nodes, workflow.edges);
          alert("Workflow loaded successfully!");
        } else {
          alert("Workflow not found");
        }
      } else {
        alert("No workflows found");
      }
    } catch (error) {
      console.error("Error loading workflows:", error);
      alert("Failed to load workflows");
    }
  }, [loadWorkflow]);

  const handleExport = useCallback(() => {
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
  }, [nodes, edges]);

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
            loadWorkflow(data.nodes, data.edges);
            alert("Workflow imported successfully!");
          } else {
            alert("Invalid workflow file");
          }
        } catch (error) {
          console.error("Error importing workflow:", error);
          alert("Failed to import workflow");
        }
      };
      reader.readAsText(file);
    },
    [loadWorkflow]
  );

  const handleClear = useCallback(() => {
    if (confirm("Are you sure you want to clear the workflow?")) {
      clearWorkflow();
    }
  }, [clearWorkflow]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg p-2">
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="p-2 hover:bg-[#2a2a2a] rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="p-2 hover:bg-[#2a2a2a] rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-[#2a2a2a]" />
      <button
        onClick={handleSave}
        className="p-2 hover:bg-[#2a2a2a] rounded text-gray-400"
        title="Save Workflow"
      >
        <Save className="w-4 h-4" />
      </button>
      <button
        onClick={handleLoad}
        className="p-2 hover:bg-[#2a2a2a] rounded text-gray-400"
        title="Load Workflow"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-[#2a2a2a]" />
      <button
        onClick={handleExport}
        className="p-2 hover:bg-[#2a2a2a] rounded text-gray-400"
        title="Export JSON"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={handleImport}
        className="p-2 hover:bg-[#2a2a2a] rounded text-gray-400"
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
      <div className="w-px h-6 bg-[#2a2a2a]" />
      <button
        onClick={handleClear}
        className="p-2 hover:bg-red-900 rounded text-red-400"
        title="Clear Workflow"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

