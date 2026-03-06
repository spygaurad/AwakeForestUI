import { useState, useEffect, useCallback } from 'react';

export interface PromptBboxTemplate {
  id: string;
  name: string;
  bboxes: [number, number, number, number][];
  createdAt: string;
  updatedAt: string;
}

interface UsePromptTemplatesOptions {
  projectId?: string;
}

export function usePromptTemplates({ projectId }: UsePromptTemplatesOptions) {
  const [templates, setTemplates] = useState<PromptBboxTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates for the project
  const fetchTemplates = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompt-templates?projectId=${encodeURIComponent(projectId)}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        throw new Error('Failed to fetch templates');
      }
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load templates on mount and when projectId changes
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Create a new template
  const createTemplate = useCallback(async (
    name: string,
    bboxes: [number, number, number, number][]
  ): Promise<PromptBboxTemplate | null> => {
    if (!projectId) return null;

    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          template: { name, bboxes }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        // Return the newly created template
        const newTemplate = data.templates?.find((t: PromptBboxTemplate) => t.name === name);
        return newTemplate || null;
      } else {
        throw new Error('Failed to create template');
      }
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message);
      return null;
    }
  }, [projectId]);

  // Update an existing template
  const updateTemplate = useCallback(async (
    templateId: string,
    name: string,
    bboxes: [number, number, number, number][]
  ): Promise<boolean> => {
    if (!projectId) return false;

    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          template: { id: templateId, name, bboxes }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        return true;
      } else {
        throw new Error('Failed to update template');
      }
    } catch (err: any) {
      console.error('Error updating template:', err);
      setError(err.message);
      return false;
    }
  }, [projectId]);

  // Delete a template
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!projectId) return false;

    try {
      const response = await fetch(
        `/api/prompt-templates?projectId=${encodeURIComponent(projectId)}&templateId=${encodeURIComponent(templateId)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        return true;
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError(err.message);
      return false;
    }
  }, [projectId]);

  // Get template by ID
  const getTemplateById = useCallback((templateId: string): PromptBboxTemplate | undefined => {
    return templates.find(t => t.id === templateId);
  }, [templates]);

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    refetch: fetchTemplates
  };
}
