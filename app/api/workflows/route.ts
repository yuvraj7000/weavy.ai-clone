import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkflows, getWorkflowById } from "@/lib/db";
import { WorkflowSchema, Workflow } from "@/lib/types";

// GET - List all workflows or get a specific workflow
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Get specific workflow
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid workflow ID" },
          { status: 400 }
        );
      }

      const workflow = await getWorkflowById(id, userId);

      if (!workflow) {
        return NextResponse.json(
          { success: false, error: "Workflow not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
        },
      });
    } else {
      // List all workflows for the user
      const workflows = await getWorkflows(userId);

      return NextResponse.json({
        success: true,
        data: (workflows as Workflow[]).map((w) => ({
          id: w.id,
          name: w.name,
          nodes: w.nodes,
          edges: w.edges,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
      });
    }
  } catch (error: unknown) {
    console.error("Get workflows error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Increase body size limit for this route handler
export const maxDuration = 30;

// POST - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse JSON with error handling for large payloads
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("JSON parse error:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid JSON in request body. The workflow data may be too large." 
        },
        { status: 400 }
      );
    }

    // Validate with Zod
    const validationResult = WorkflowSchema.safeParse({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid workflow data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const workflow = validationResult.data;
    const { createWorkflow } = await import("@/lib/db");
    
    const result = await createWorkflow({
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          nodes: result.nodes,
          edges: result.edges,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create workflow error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing workflow
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "Valid workflow ID is required" },
        { status: 400 }
      );
    }

    // Validate with Zod
    const validationResult = WorkflowSchema.safeParse({
      ...updateData,
      updatedAt: new Date(),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid workflow data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const workflow = validationResult.data;
    const { updateWorkflow } = await import("@/lib/db");

    const result = await updateWorkflow(id, {
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      userId,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        nodes: result.nodes,
        edges: result.edges,
      },
    });
  } catch (error: unknown) {
    console.error("Update workflow error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Check if it's a "not found" error from Supabase
    if (errorMessage.includes("not found") || errorMessage.includes("No rows")) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a workflow
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "Valid workflow ID is required" },
        { status: 400 }
      );
    }

    const { deleteWorkflow } = await import("@/lib/db");
    const result = await deleteWorkflow(id, userId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Delete workflow error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    // Check if it's a "not found" error from Supabase
    if (errorMessage.includes("not found") || errorMessage.includes("No rows")) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

