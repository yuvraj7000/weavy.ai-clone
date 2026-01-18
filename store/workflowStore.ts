import { create } from "zustand";
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from "reactflow";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  workflowId: string | null;
  workflowUserId: string | null; // Track workflow owner
  history: { nodes: Node[]; edges: Edge[]; timestamp: Date }[];
  historyIndex: number;
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowId: (id: string | null) => void;
  setWorkflowUserId: (userId: string | null) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  
  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Workflow management
  loadWorkflow: (nodes: Node[], edges: Edge[], name?: string, id?: string, userId?: string) => void;
  clearWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowName: "",
  workflowId: null,
  workflowUserId: null,
  history: [],
  historyIndex: -1,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowUserId: (userId) => set({ workflowUserId: userId }),

  onNodesChange: (changes) => {
    // Only save to history if it's not just a selection change
    const isOnlySelectionChange = changes.every(
      change => change.type === 'select' || change.type === 'position' || change.type === 'dimensions'
    );
    
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    
    // Don't save selection/position changes to history (they're not undoable actions)
    if (!isOnlySelectionChange) {
      get().saveToHistory();
    }
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
    get().saveToHistory();
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
    get().saveToHistory();
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
    get().saveToHistory();
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    get().saveToHistory();
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } as Node["data"] }
          : node
      ),
    });
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ 
      nodes: JSON.parse(JSON.stringify(nodes)), 
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: new Date(),
    });
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      set({
        nodes: previousState.nodes,
        edges: previousState.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },

  canUndo: () => {
    return get().historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

      loadWorkflow: (nodes, edges, name, id, userId) => {
        set({
          nodes,
          edges,
          workflowName: name || "",
          workflowId: id || null,
          workflowUserId: userId || null,
          history: [{ 
            nodes: JSON.parse(JSON.stringify(nodes)), 
            edges: JSON.parse(JSON.stringify(edges)),
            timestamp: new Date(),
          }],
          historyIndex: 0,
        });
      },

      clearWorkflow: () => {
        const emptyState = { nodes: [], edges: [], timestamp: new Date() };
        set({
          nodes: [],
          edges: [],
          workflowName: "",
          workflowId: null,
          workflowUserId: null,
          history: [emptyState],
          historyIndex: 0,
        });
      },
}));

