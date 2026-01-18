import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Workflow } from "./types";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/nextjs-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Database helper functions
export async function getWorkflows(userId?: string) {
  if (userId) {
    // Get user's private workflows and all public workflows
    const [privateWorkflows, publicWorkflows] = await Promise.all([
      prisma.workflow.findMany({
        where: { 
          userId,
          isPublic: false,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.workflow.findMany({
        where: { 
          isPublic: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    
    // Return private first, then public
    return [...privateWorkflows, ...publicWorkflows];
  }
  
  // If no userId, return only public workflows
  return await prisma.workflow.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkflowById(id: string, userId?: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id },
  });
  
  if (!workflow) {
    return null;
  }
  
  // If workflow is public, anyone can view it
  // If workflow is private, only the owner can view it
  if (workflow.isPublic || (userId && workflow.userId === userId)) {
    return workflow;
  }
  
  return null;
}

export async function createWorkflow(workflow: Omit<Workflow, "id" | "createdAt" | "updatedAt"> & { userId: string; isPublic?: boolean }) {
  return await prisma.workflow.create({
    data: {
      name: workflow.name,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
      userId: workflow.userId,
      isPublic: workflow.isPublic ?? false,
    },
  });
}

export async function updateWorkflow(id: string, workflow: Partial<Workflow> & { userId: string; isPublic?: boolean }) {
  const updateData: any = {};
  if (workflow.name !== undefined) updateData.name = workflow.name;
  if (workflow.nodes !== undefined) updateData.nodes = workflow.nodes as any;
  if (workflow.edges !== undefined) updateData.edges = workflow.edges as any;
  if (workflow.isPublic !== undefined) updateData.isPublic = workflow.isPublic;
  
  return await prisma.workflow.updateMany({
    where: {
      id,
      userId: workflow.userId, // Ensure user owns the workflow
    },
    data: updateData,
  }).then(async (result) => {
    if (result.count === 0) {
      return null;
    }
    return await prisma.workflow.findUnique({
      where: { id },
    });
  });
}

export async function deleteWorkflow(id: string, userId: string) {
  const result = await prisma.workflow.deleteMany({
    where: {
      id,
      userId, // Ensure user owns the workflow
    },
  });
  
  return result.count > 0;
}
