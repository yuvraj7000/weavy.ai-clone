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
    return await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }
  
  return await prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkflowById(id: string, userId?: string) {
  const where: { id: string; userId?: string } = { id };
  
  if (userId) {
    where.userId = userId;
  }
  
  return await prisma.workflow.findUnique({
    where,
  });
}

export async function createWorkflow(workflow: Omit<Workflow, "id" | "createdAt" | "updatedAt"> & { userId: string }) {
  return await prisma.workflow.create({
    data: {
      name: workflow.name,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
      userId: workflow.userId,
    },
  });
}

export async function updateWorkflow(id: string, workflow: Partial<Workflow> & { userId: string }) {
  return await prisma.workflow.updateMany({
    where: {
      id,
      userId: workflow.userId, // Ensure user owns the workflow
    },
    data: {
      name: workflow.name!,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
    },
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
