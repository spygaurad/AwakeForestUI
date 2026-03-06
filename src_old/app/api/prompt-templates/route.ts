import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'prompt-templates.json');

interface PromptBboxTemplate {
  id: string;
  name: string;
  bboxes: [number, number, number, number][];
  createdAt: string;
  updatedAt: string;
}

interface ProjectTemplates {
  [projectId: string]: PromptBboxTemplate[];
}

// Ensure the data directory and file exist
function ensureDataFile() {
  const dir = path.dirname(TEMPLATES_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({ projects: {} }, null, 2));
  }
}

// GET - Load templates for a specific project
export async function GET(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    const templates = jsonData.projects?.[projectId] || [];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error reading templates:', error);
    return NextResponse.json(
      { error: 'Failed to read templates' },
      { status: 500 }
    );
  }
}

// POST - Create or update a template
export async function POST(request: NextRequest) {
  try {
    ensureDataFile();
    const body = await request.json();
    const { projectId, template } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!template || !template.name || !template.bboxes) {
      return NextResponse.json(
        { error: 'template with name and bboxes is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    // Ensure projects object exists
    if (!jsonData.projects) {
      jsonData.projects = {};
    }

    // Ensure project array exists
    if (!jsonData.projects[projectId]) {
      jsonData.projects[projectId] = [];
    }

    const now = new Date().toISOString();

    // Check if updating existing template
    const existingIndex = jsonData.projects[projectId].findIndex(
      (t: PromptBboxTemplate) => t.id === template.id
    );

    if (existingIndex >= 0) {
      // Update existing
      jsonData.projects[projectId][existingIndex] = {
        ...jsonData.projects[projectId][existingIndex],
        name: template.name,
        bboxes: template.bboxes,
        updatedAt: now
      };
    } else {
      // Create new
      const newTemplate: PromptBboxTemplate = {
        id: template.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: template.name,
        bboxes: template.bboxes,
        createdAt: now,
        updatedAt: now
      };
      jsonData.projects[projectId].push(newTemplate);
    }

    // Write back to file
    fs.writeFileSync(
      TEMPLATES_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      templates: jsonData.projects[projectId]
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    ensureDataFile();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const templateId = searchParams.get('templateId');

    if (!projectId || !templateId) {
      return NextResponse.json(
        { error: 'projectId and templateId are required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
    const jsonData = JSON.parse(data);

    if (jsonData.projects?.[projectId]) {
      jsonData.projects[projectId] = jsonData.projects[projectId].filter(
        (t: PromptBboxTemplate) => t.id !== templateId
      );
    }

    // Write back to file
    fs.writeFileSync(
      TEMPLATES_FILE,
      JSON.stringify(jsonData, null, 2)
    );

    return NextResponse.json({
      success: true,
      templates: jsonData.projects[projectId] || []
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
