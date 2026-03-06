import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MODELS_FILE = path.join(process.cwd(), 'data', 'ml-models.json');

export interface InferenceModel {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  version: string;
  model_type: 'detection' | 'segmentation' | 'classification';
  is_public: boolean;
  endpoint_url: string;
  endpoint_path: string;
  supported_classes?: string[];
  config?: Record<string, unknown>;
  category: 'standard' | 'sam3' | 'custom';
  createdAt: string;
  updatedAt: string;
}

// Ensure the data directory and file exist
function ensureDataFile() {
  const dir = path.dirname(MODELS_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(MODELS_FILE)) {
    fs.writeFileSync(MODELS_FILE, JSON.stringify({ models: [] }, null, 2));
  }
}

// GET - Retrieve all models or filter by visibility/category
export async function GET(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const isPublic = searchParams.get('is_public');
    const category = searchParams.get('category');

    const data = fs.readFileSync(MODELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    let models: InferenceModel[] = jsonData.models || [];

    // Filter by is_public if provided
    if (isPublic !== null) {
      const publicFilter = isPublic === 'true';
      models = models.filter((model) => model.is_public === publicFilter);
    }

    // Filter by category if provided
    if (category) {
      models = models.filter((model) => model.category === category);
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error reading models:', error);
    return NextResponse.json(
      { error: 'Failed to read models' },
      { status: 500 }
    );
  }
}

// POST - Create a new model
export async function POST(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const {
      name,
      display_name,
      description,
      version,
      model_type,
      endpoint_url,
      endpoint_path,
      supported_classes,
      config,
      category,
      is_public
    } = body;

    // Validate required fields
    if (!name || !display_name || !version || !model_type || !endpoint_url || !endpoint_path) {
      return NextResponse.json(
        { error: 'Required fields: name, display_name, version, model_type, endpoint_url, endpoint_path' },
        { status: 400 }
      );
    }

    // Validate model_type
    if (!['detection', 'segmentation', 'classification'].includes(model_type)) {
      return NextResponse.json(
        { error: 'model_type must be one of: detection, segmentation, classification' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(MODELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (!jsonData.models) {
      jsonData.models = [];
    }

    // Check for duplicate name
    const existingModel = jsonData.models.find(
      (model: InferenceModel) => model.name.toLowerCase() === name.toLowerCase()
    );

    if (existingModel) {
      return NextResponse.json(
        { error: 'Model with this name already exists' },
        { status: 400 }
      );
    }

    // Create new model
    const newModel: InferenceModel = {
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      display_name: display_name.trim(),
      description: description?.trim() || '',
      version: version.trim(),
      model_type,
      is_public: is_public ?? false,
      endpoint_url: endpoint_url.trim(),
      endpoint_path: endpoint_path.trim(),
      supported_classes: supported_classes || [],
      config: config || {},
      category: category || 'custom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jsonData.models.push(newModel);

    // Write back to file
    fs.writeFileSync(MODELS_FILE, JSON.stringify(jsonData, null, 2));

    return NextResponse.json({
      success: true,
      model: newModel
    });
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing model
export async function PUT(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(MODELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (!jsonData.models) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Find model
    const modelIndex = jsonData.models.findIndex((model: InferenceModel) => model.id === id);

    if (modelIndex === -1) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'display_name', 'description', 'version', 'model_type',
      'is_public', 'endpoint_url', 'endpoint_path', 'supported_classes',
      'config', 'category'
    ];

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        jsonData.models[modelIndex][field] = updateFields[field];
      }
    }

    jsonData.models[modelIndex].updatedAt = new Date().toISOString();

    // Write back to file
    fs.writeFileSync(MODELS_FILE, JSON.stringify(jsonData, null, 2));

    return NextResponse.json({
      success: true,
      model: jsonData.models[modelIndex]
    });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a model
export async function DELETE(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(MODELS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (!jsonData.models) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Find model
    const modelIndex = jsonData.models.findIndex((model: InferenceModel) => model.id === id);

    if (modelIndex === -1) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Remove model
    jsonData.models.splice(modelIndex, 1);

    // Write back to file
    fs.writeFileSync(MODELS_FILE, JSON.stringify(jsonData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
