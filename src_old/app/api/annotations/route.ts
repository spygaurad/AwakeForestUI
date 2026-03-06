import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ANNOTATIONS_FILE = path.join(process.cwd(), 'data', 'annotations.json');

// Ensure the data directory and file exist
function ensureDataFile() {
  const dir = path.dirname(ANNOTATIONS_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(ANNOTATIONS_FILE)) {
    fs.writeFileSync(ANNOTATIONS_FILE, JSON.stringify({ patches: {} }, null, 2));
  }
}

// GET - Load annotations for a specific patch
export async function GET(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const patchId = searchParams.get('patchId');

    const data = fs.readFileSync(ANNOTATIONS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (patchId !== null) {
      // Return annotations for specific patch
      const patchData = jsonData.patches?.[patchId];

      if (patchData) {
        // New format with metadata
        if (patchData.annotations && patchData.metadata) {
          return NextResponse.json({
            annotations: patchData.annotations,
            promptBboxes: patchData.promptBboxes || [],
            metadata: patchData.metadata
          });
        }
        // Legacy format (just array of annotations)
        return NextResponse.json({
          annotations: patchData,
          promptBboxes: [],
          metadata: null
        });
      }

      // No data for this patch
      return NextResponse.json({
        annotations: [],
        promptBboxes: [],
        metadata: null
      });
    } else {
      // Return all patches
      return NextResponse.json(jsonData);
    }
  } catch (error) {
    console.error('Error reading annotations:', error);
    return NextResponse.json(
      { error: 'Failed to read annotations' },
      { status: 500 }
    );
  }
}

// POST - Save/update annotations for a specific patch
export async function POST(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const {
      patchId,
      annotations,
      promptBboxes,
      projectId,
      datasetId,
      itemId,
      gridIndex,
      tiffUrl,
      bounds,
      gridSize
    } = body;

    if (patchId === undefined) {
      return NextResponse.json(
        { error: 'patchId is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(ANNOTATIONS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    // Ensure patches object exists
    if (!jsonData.patches) {
      jsonData.patches = {};
    }

    // Store annotations with full metadata
    jsonData.patches[patchId] = {
      annotations: annotations || [],
      promptBboxes: promptBboxes || [],
      metadata: {
        projectId,
        datasetId,
        itemId,
        gridIndex,
        tiffUrl,
        bounds,
        gridSize,
        updatedAt: new Date().toISOString(),
        createdAt: jsonData.patches[patchId]?.metadata?.createdAt || new Date().toISOString()
      }
    };

    // Write back to file
    fs.writeFileSync(
      ANNOTATIONS_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: `Annotations saved for patch ${patchId}`
    });
  } catch (error) {
    console.error('Error saving annotations:', error);
    return NextResponse.json(
      { error: 'Failed to save annotations' },
      { status: 500 }
    );
  }
}

// DELETE - Clear annotations for a specific patch or all patches
export async function DELETE(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const patchId = searchParams.get('patchId');

    const data = fs.readFileSync(ANNOTATIONS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (patchId !== null) {
      // Clear specific patch
      if (jsonData.patches) {
        delete jsonData.patches[patchId];
      }
    } else {
      // Clear all patches
      jsonData.patches = {};
    }

    fs.writeFileSync(
      ANNOTATIONS_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: patchId ? `Patch ${patchId} cleared` : 'All patches cleared'
    });
  } catch (error) {
    console.error('Error clearing annotations:', error);
    return NextResponse.json(
      { error: 'Failed to clear annotations' },
      { status: 500 }
    );
  }
}
