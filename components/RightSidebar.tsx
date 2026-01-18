"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { Clock, X, Terminal, ChevronRight, ChevronLeft, Save, Play } from "lucide-react";

// Custom event for workflow saves
const WORKFLOW_SAVE_EVENT = "workflow-saved";
export function emitWorkflowSave(workflowName: string, workflowId: string) {
  window.dispatchEvent(new CustomEvent(WORKFLOW_SAVE_EVENT, { 
    detail: { workflowName, workflowId } 
  }));
}

// Custom event for run status updates from Trigger.dev
const RUN_STATUS_UPDATE_EVENT = "run-status-update";
export interface RunStatusUpdate {
  id: string; // run ID from Trigger.dev
  status: "EXECUTING" | "WAITING" | "COMPLETED" | "FAILED" | "CRASHED";
  nodeId?: string;
  nodeType?: string;
  nodeName?: string;
  error?: string;
  output?: any;
}

export function emitRunStatusUpdate(update: RunStatusUpdate) {
  window.dispatchEvent(new CustomEvent(RUN_STATUS_UPDATE_EVENT, { 
    detail: update 
  }));
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "task" | "workflow";
  nodeId?: string;
  nodeType?: string;
  nodeName?: string;
  status: "running" | "completed" | "failed" | "waiting" | "saved" | "executed";
  message: string;
  details?: string;
}

export default function RightSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const nodes = useWorkflowStore((state) => state.nodes);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);

  // Monitor nodes for initial log creation (only create, don't update)
  // Updates will come from Trigger.dev run status events
  useEffect(() => {
    const newLogs: LogEntry[] = [];

    nodes.forEach((node) => {
      const nodeData = node.data as any;
      
      // Check if node has a runId (task is running or completed)
      // Each execution should have a unique runID as the key
      if (nodeData.runId) {
        // Use runID as the unique identifier for this execution
        const runId = nodeData.runId as string;
        const existingLog = logs.find((log) => log.id === runId);
        
        // Only create a new log if one doesn't exist for this runId
        // Don't update existing logs here - let Trigger.dev events handle updates
        if (!existingLog) {
          // Determine initial status from node data
          let status: "running" | "completed" | "failed" | "waiting" = "waiting";
          if (nodeData.loading) {
            status = "running";
          } else if (nodeData.error) {
            status = "failed";
          } else if (nodeData.output !== undefined || nodeData.croppedImageUrl || nodeData.extractedFrameUrl) {
            status = "completed";
          }
          
          // New task execution - use runID as unique key
          newLogs.push({
            id: runId, // Use runID as the unique key for this execution
            timestamp: new Date(),
            type: "task",
            nodeId: node.id,
            nodeType: node.type || "unknown",
            nodeName: getNodeDisplayName(node),
            status,
            message: `${getNodeDisplayName(node)} task started`,
            details: getNodeDetails(node),
          });
        }
      }

      // Check for errors (only if no runId exists, to avoid duplicate logs)
      if (nodeData.error && !nodeData.runId) {
        // For errors without runId, use nodeId + timestamp as unique key
        const errorLogId = `error-${node.id}-${Date.now()}`;
        const existingErrorLog = logs.find((log) => log.nodeId === node.id && log.status === "failed" && !log.id.startsWith("error-"));
        
        if (!existingErrorLog) {
          newLogs.push({
            id: errorLogId,
            timestamp: new Date(),
            type: "task",
            nodeId: node.id,
            nodeType: node.type || "unknown",
            nodeName: getNodeDisplayName(node),
            status: "failed",
            message: `Error in ${getNodeDisplayName(node)}`,
            details: typeof nodeData.error === "string" ? nodeData.error : JSON.stringify(nodeData.error),
          });
        }
      }
    });

    if (newLogs.length > 0) {
      setLogs((prevLogs) => {
        // Only add new logs, don't update existing ones
        const merged = [...prevLogs];
        
        newLogs.forEach((newLog) => {
          const existingIndex = merged.findIndex((log) => log.id === newLog.id);
          if (existingIndex === -1) {
            merged.push(newLog);
          }
        });
        
        // Sort by timestamp, newest first
        return merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    }
  }, [nodes, logs]);

  // Track run status updates from Trigger.dev via custom event
  useEffect(() => {
    const getStatusMessageFromUpdate = (update: RunStatusUpdate, logStatus: "running" | "completed" | "failed" | "waiting"): string => {
      const nodeName = update.nodeName || "Task";
      switch (logStatus) {
        case "completed":
          return `${nodeName} task completed successfully`;
        case "failed":
          return `${nodeName} task failed`;
        case "running":
          return `${nodeName} task is running...`;
        case "waiting":
          return `${nodeName} task is waiting...`;
        default:
          return `${nodeName} task status: ${update.status}`;
      }
    };

    const handleRunStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<RunStatusUpdate>;
      const update = customEvent.detail;
      
      // Map Trigger.dev status to our log status
      let logStatus: "running" | "completed" | "failed" | "waiting" = "waiting";
      if (update.status === "EXECUTING" || update.status === "WAITING") {
        logStatus = update.status === "EXECUTING" ? "running" : "waiting";
      } else if (update.status === "COMPLETED") {
        logStatus = "completed";
      } else if (update.status === "FAILED" || update.status === "CRASHED") {
        logStatus = "failed";
      }

      // Extract output data for successful completions
      let outputDetails: string | undefined = undefined;
      if (update.output && typeof update.output === 'object') {
        const output = update.output as { success?: boolean; data?: any; error?: string };
        if (output.success && output.data) {
          // Format output.data based on its structure
          if (typeof output.data === 'string') {
            outputDetails = output.data;
          } else if (output.data.text) {
            // LLM output
            outputDetails = output.data.text;
          } else if (output.data.url) {
            // Image/Video output
            outputDetails = `URL: ${output.data.url}`;
          } else {
            // Fallback to JSON stringify
            outputDetails = JSON.stringify(output.data, null, 2);
          }
        } else if (output.error) {
          outputDetails = `Error: ${output.error}`;
        }
      }

      setLogs((prevLogs) => {
        // Find existing log by run ID
        const existingLogIndex = prevLogs.findIndex((log) => log.id === update.id);
        
        if (existingLogIndex >= 0) {
          // Update existing log
          const updatedLogs = [...prevLogs];
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            status: logStatus,
            message: getStatusMessageFromUpdate(update, logStatus),
            details: update.error 
              ? `Error: ${update.error}` 
              : outputDetails 
              ? outputDetails
              : updatedLogs[existingLogIndex].details,
          };
          return updatedLogs;
        } else {
          // Create new log entry
          return [
            {
              id: update.id, // Use run ID as unique key
              timestamp: new Date(),
              type: "task",
              nodeId: update.nodeId,
              nodeType: update.nodeType || "unknown",
              nodeName: update.nodeName || "Task",
              status: logStatus,
              message: getStatusMessageFromUpdate(update, logStatus),
              details: update.error || outputDetails || undefined,
            },
            ...prevLogs,
          ];
        }
      });
    };

    window.addEventListener(RUN_STATUS_UPDATE_EVENT, handleRunStatusUpdate);
    return () => {
      window.removeEventListener(RUN_STATUS_UPDATE_EVENT, handleRunStatusUpdate);
    };
  }, []);

  // Track workflow save events via custom event
  useEffect(() => {
    const handleWorkflowSave = (event: Event) => {
      const customEvent = event as CustomEvent<{ workflowName: string; workflowId: string }>;
      const { workflowName: savedName, workflowId: savedId } = customEvent.detail;
      
      setLogs((prevLogs) => {
        // Avoid duplicate logs for the same save
        const logId = `save-${savedId}-${Date.now()}`;
        return [
          {
            id: logId,
            timestamp: new Date(),
            type: "workflow",
            status: "saved",
            message: `Workflow "${savedName || "Untitled"}" saved`,
            details: `Workflow ID: ${savedId}`,
          },
          ...prevLogs,
        ];
      });
    };

    window.addEventListener(WORKFLOW_SAVE_EVENT, handleWorkflowSave);
    return () => {
      window.removeEventListener(WORKFLOW_SAVE_EVENT, handleWorkflowSave);
    };
  }, []);

  const runningLogs = logs.filter((log) => log.status === "running" || log.status === "waiting");
  const allLogsSorted = useMemo(() => {
    return [...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [logs]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 w-8 h-16 bg-[#212126] border-l border-y border-[#302e33] flex items-center justify-center text-gray-400 hover:text-gray-300 hover:bg-[#353539] transition-all duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-0"
        }`}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 z-40 bg-[#212126]/30 backdrop-blur-sm border-l border-[#302e33]/50 flex flex-col h-full overflow-hidden shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? "w-80 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="py-4 px-4 border-b border-[#302e33] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-300">Execution Logs</h2>
            {runningLogs.length > 0 && (
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                {runningLogs.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#454549] scrollbar-track-transparent hover:scrollbar-thumb-[#5C5C5F]">
          <div className="p-4 space-y-2">
            {allLogsSorted.length > 0 ? (
              allLogsSorted.map((log) => (
                <LogItem key={log.id} log={log} /> // Each execution uses its unique runID as the key
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
                <p className="text-xs mt-1">Task execution logs and workflow history will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {logs.length > 0 && (
          <div className="px-4 py-2 border-t border-[#302e33] text-xs text-gray-500">
            {runningLogs.length > 0 && (
              <span className="mr-4">
                {runningLogs.length} running
              </span>
            )}
            <span>{logs.length} total entries</span>
          </div>
        )}
      </div>
    </>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    waiting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    saved: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    executed: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  };

  const statusIcons = {
    running: "●",
    waiting: "○",
    completed: "✓",
    failed: "✗",
    saved: "💾",
    executed: "▶",
  };

  const typeIcons = {
    task: Terminal,
    workflow: log.status === "saved" ? Save : Play,
  };

  const TypeIcon = typeIcons[log.type] || Terminal;

  return (
    <div
      className={`bg-[#1a1a1a] border border-[#302e33] rounded p-3 cursor-pointer transition-colors hover:bg-[#252529] ${
        expanded ? "border-[#454549]" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className="w-3 h-3 text-gray-500 shrink-0" />
            <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColors[log.status]}`}>
              {statusIcons[log.status]} {log.status}
            </span>
            {log.nodeName && (
              <span className="text-xs text-gray-500 truncate">{log.nodeName}</span>
            )}
          </div>
          <p className="text-sm text-gray-300">{log.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <p className="text-xs text-gray-500">
              {formatTimestamp(log.timestamp)}
            </p>
          </div>
        </div>
      </div>
      {expanded && log.details && (
        <div className="mt-2 pt-2 border-t border-[#302e33]">
          <p className="text-xs text-gray-400 font-mono break-words line-clamp-2">
            {log.details}
          </p>
        </div>
      )}
    </div>
  );
}

function getNodeDisplayName(node: any): string {
  const type = node.type || "unknown";
  const typeMap: Record<string, string> = {
    text: "Text Node",
    image: "Image Node",
    video: "Video Node",
    llm: "LLM Node",
    cropImage: "Crop Image Node",
    extractFrame: "Extract Frame Node",
  };
  return typeMap[type] || `${type} Node`;
}

function getNodeDetails(node: any): string {
  const data = node.data || {};
  const details: string[] = [];

  if (data.model) details.push(`Model: ${data.model}`);
  if (data.timestamp) details.push(`Timestamp: ${data.timestamp}`);
  if (data.xPercent !== undefined) {
    details.push(`Crop: ${data.xPercent}%, ${data.yPercent}% (${data.widthPercent}% × ${data.heightPercent}%)`);
  }

  return details.join(" | ") || "No details";
}

function getStatusMessage(node: any, status: string): string {
  const nodeName = getNodeDisplayName(node);
  switch (status) {
    case "completed":
      return `${nodeName} task completed successfully`;
    case "failed":
      return `${nodeName} task failed`;
    case "running":
      return `${nodeName} task is running...`;
    case "waiting":
      return `${nodeName} task is waiting...`;
    default:
      return `${nodeName} task status: ${status}`;
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
