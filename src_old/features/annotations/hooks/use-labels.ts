'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '../types';

interface UseLabelsOptions {
  projectId?: string;
}

interface UseLabelsReturn {
  labels: Label[];
  isLoading: boolean;
  error: string | null;
  createLabel: (name: string, color: string) => Promise<Label | null>;
  updateLabel: (id: string, name: string, color: string) => Promise<boolean>;
  deleteLabel: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  getLabelById: (id: string) => Label | undefined;
  getLabelByName: (name: string) => Label | undefined;
}

export function useLabels(options?: UseLabelsOptions): UseLabelsReturn {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.projectId) {
        params.append('projectId', options.projectId);
      }

      const response = await fetch(`/api/labels?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch labels');
      }

      const data = await response.json();
      setLabels(data.labels || []);
    } catch (err: any) {
      console.error('Error fetching labels:', err);
      setError(err.message || 'Failed to load labels');
      setLabels([]);
    } finally {
      setIsLoading(false);
    }
  }, [options?.projectId]);

  // Fetch labels on mount and when projectId changes
  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const createLabel = useCallback(async (name: string, color: string): Promise<Label | null> => {
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          projectId: options?.projectId || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create label');
      }

      const data = await response.json();
      const newLabel = data.label;

      // Update local state
      setLabels(prev => [...prev, newLabel]);

      return newLabel;
    } catch (err: any) {
      console.error('Error creating label:', err);
      setError(err.message);
      return null;
    }
  }, [options?.projectId]);

  const updateLabel = useCallback(async (id: string, name: string, color: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/labels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, color })
      });

      if (!response.ok) {
        throw new Error('Failed to update label');
      }

      const data = await response.json();
      const updatedLabel = data.label;

      // Update local state
      setLabels(prev => prev.map(label =>
        label.id === id ? updatedLabel : label
      ));

      return true;
    } catch (err: any) {
      console.error('Error updating label:', err);
      setError(err.message);
      return false;
    }
  }, []);

  const deleteLabel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/labels?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete label');
      }

      // Update local state
      setLabels(prev => prev.filter(label => label.id !== id));

      return true;
    } catch (err: any) {
      console.error('Error deleting label:', err);
      setError(err.message);
      return false;
    }
  }, []);

  const getLabelById = useCallback((id: string): Label | undefined => {
    return labels.find(label => label.id === id);
  }, [labels]);

  const getLabelByName = useCallback((name: string): Label | undefined => {
    return labels.find(label =>
      label.name.toLowerCase() === name.toLowerCase()
    );
  }, [labels]);

  return {
    labels,
    isLoading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    refetch: fetchLabels,
    getLabelById,
    getLabelByName
  };
}
