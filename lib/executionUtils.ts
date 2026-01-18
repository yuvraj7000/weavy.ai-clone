import { Node, Edge } from "reactflow";

/**
 * Calculate execution order for selected nodes based on dependencies
 * Returns nodes in execution order (nodes with no dependencies first)
 */
export function calculateExecutionOrder(
  selectedNodeIds: string[],
  allNodes: Node[],
  allEdges: Edge[]
): string[][] {
  // Build dependency graph for selected nodes only
  const nodeMap = new Map<string, Node>();
  allNodes.forEach(node => nodeMap.set(node.id, node));
  
  // Build adjacency list: nodeId -> [dependencies]
  const dependencies = new Map<string, string[]>();
  selectedNodeIds.forEach(nodeId => {
    dependencies.set(nodeId, []);
  });
  
  // Find dependencies within selected nodes
  allEdges.forEach(edge => {
    if (selectedNodeIds.includes(edge.target) && selectedNodeIds.includes(edge.source)) {
      const currentDeps = dependencies.get(edge.target) || [];
      if (!currentDeps.includes(edge.source)) {
        currentDeps.push(edge.source);
        dependencies.set(edge.target, currentDeps);
      }
    }
  });
  
  // Topological sort - find nodes that can run in parallel
  const executionLevels: string[][] = [];
  const processed = new Set<string>();
  const inProgress = new Set<string>();
  
  function visit(nodeId: string, level: number) {
    if (processed.has(nodeId)) return;
    if (inProgress.has(nodeId)) {
      // Circular dependency detected
      console.warn(`Circular dependency detected involving node ${nodeId}`);
      return;
    }
    
    inProgress.add(nodeId);
    
    const deps = dependencies.get(nodeId) || [];
    // Process dependencies first
    deps.forEach(depId => {
      visit(depId, level + 1);
    });
    
    inProgress.delete(nodeId);
    processed.add(nodeId);
    
    // Add to appropriate level
    while (executionLevels.length <= level) {
      executionLevels.push([]);
    }
    executionLevels[level].push(nodeId);
  }
  
  // Visit all selected nodes
  selectedNodeIds.forEach(nodeId => {
    if (!processed.has(nodeId)) {
      visit(nodeId, 0);
    }
  });
  
  // Reverse to get execution order (level 0 first)
  return executionLevels.reverse();
}

/**
 * Get input data for a node from its connected source nodes
 */
export function getNodeInputs(nodeId: string, nodes: Node[], edges: Edge[]): Record<string, any> {
  const inputs: Record<string, any> = {};
  
  // Find all edges that connect to this node
  const incomingEdges = edges.filter(edge => edge.target === nodeId);
  
  incomingEdges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode) {
      const sourceData = sourceNode.data as any;
      
      // Map output based on source node type
      if (sourceNode.type === "text") {
        inputs[edge.sourceHandle || "text"] = sourceData.text || "";
      } else if (sourceNode.type === "image") {
        inputs[edge.sourceHandle || "image"] = sourceData.imageUrl || sourceData.imageBase64 || "";
      } else if (sourceNode.type === "video") {
        inputs[edge.sourceHandle || "video"] = sourceData.videoUrl || sourceData.videoBase64 || "";
      } else if (sourceNode.type === "llm") {
        inputs[edge.sourceHandle || "output"] = sourceData.output || "";
      } else if (sourceNode.type === "cropImage") {
        inputs[edge.sourceHandle || "image"] = sourceData.croppedImageUrl || "";
      } else if (sourceNode.type === "extractFrame") {
        inputs[edge.sourceHandle || "image"] = sourceData.extractedFrameUrl || "";
      }
    }
  });
  
  return inputs;
}

