import { NextRequest, NextResponse } from "next/server";
import { getWorkflowsCollection } from "@/lib/db";
import { WorkflowSchema, Workflow } from "@/lib/types";
import { ObjectId } from "mongodb";

// GET - List all workflows or get a specific workflow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const collection = await getWorkflowsCollection();

    if (id) {
      // Get specific workflow
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, error: "Invalid workflow ID" },
          { status: 400 }
        );
      }

      const workflow = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!workflow) {
        return NextResponse.json(
          { success: false, error: "Workflow not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: workflow._id.toString(),
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
        },
      });
    } else {
      // List all workflows
      const workflows = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .toArray();

      return NextResponse.json({
        success: true,
        data: workflows.map((w: Workflow & { _id: ObjectId }) => ({
          id: w._id.toString(),
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

// POST - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    const collection = await getWorkflowsCollection();
    const workflow = validationResult.data;

    const result = await collection.insertOne({
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.insertedId.toString(),
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
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
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id || !ObjectId.isValid(id)) {
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

    const collection = await getWorkflowsCollection();
    const workflow = validationResult.data;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        name: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
    });
  } catch (error: unknown) {
    console.error("Update workflow error:", error);
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

// DELETE - Delete a workflow
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Valid workflow ID is required" },
        { status: 400 }
      );
    }

    const collection = await getWorkflowsCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
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
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

