import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LABELS_FILE = path.join(process.cwd(), 'data', 'labels.json');

// Ensure the data directory and file exist
function ensureDataFile() {
  const dir = path.dirname(LABELS_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(LABELS_FILE)) {
    fs.writeFileSync(LABELS_FILE, JSON.stringify({ labels: [] }, null, 2));
  }
}

// GET - Retrieve all labels or filter by projectId
export async function GET(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    const data = fs.readFileSync(LABELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    let labels = jsonData.labels || [];

    // Filter by projectId if provided
    if (projectId) {
      labels = labels.filter((label: any) =>
        !label.projectId || label.projectId === projectId
      );
    }

    return NextResponse.json({ labels });
  } catch (error) {
    console.error('Error reading labels:', error);
    return NextResponse.json(
      { error: 'Failed to read labels' },
      { status: 500 }
    );
  }
}

// POST - Create a new label
export async function POST(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const { name, color, projectId } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(LABELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    // Ensure labels array exists
    if (!jsonData.labels) {
      jsonData.labels = [];
    }

    // Check for duplicate name (case-insensitive)
    const existingLabel = jsonData.labels.find(
      (label: any) =>
        label.name.toLowerCase() === name.toLowerCase() &&
        (!projectId || !label.projectId || label.projectId === projectId)
    );

    if (existingLabel) {
      return NextResponse.json(
        { error: 'Label with this name already exists' },
        { status: 400 }
      );
    }

    // Create new label
    const newLabel = {
      id: `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      projectId: projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jsonData.labels.push(newLabel);

    // Write back to file
    fs.writeFileSync(
      LABELS_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      label: newLabel
    });
  } catch (error) {
    console.error('Error creating label:', error);
    return NextResponse.json(
      { error: 'Failed to create label' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing label
export async function PUT(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Label ID is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(LABELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (!jsonData.labels) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    // Find and update label
    const labelIndex = jsonData.labels.findIndex((label: any) => label.id === id);

    if (labelIndex === -1) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (name !== undefined) {
      jsonData.labels[labelIndex].name = name;
    }
    if (color !== undefined) {
      jsonData.labels[labelIndex].color = color;
    }
    jsonData.labels[labelIndex].updatedAt = new Date().toISOString();

    // Write back to file
    fs.writeFileSync(
      LABELS_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      label: jsonData.labels[labelIndex]
    });
  } catch (error) {
    console.error('Error updating label:', error);
    return NextResponse.json(
      { error: 'Failed to update label' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a label
export async function DELETE(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Label ID is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(LABELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (!jsonData.labels) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    // Find label
    const labelIndex = jsonData.labels.findIndex((label: any) => label.id === id);

    if (labelIndex === -1) {
      return NextResponse.json(
        { error: 'Label not found' },
        { status: 404 }
      );
    }

    // Remove label
    jsonData.labels.splice(labelIndex, 1);

    // Write back to file
    fs.writeFileSync(
      LABELS_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: 'Label deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting label:', error);
    return NextResponse.json(
      { error: 'Failed to delete label' },
      { status: 500 }
    );
  }
}
