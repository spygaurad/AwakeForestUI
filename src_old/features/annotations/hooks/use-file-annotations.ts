'use client';

import { useState, useEffect, useCallback } from 'react';
import { UIAnnotation } from '../types';

interface UseFileAnnotationsOptions {
  itemId?: string;
  autoRefresh?: boolean; // Auto-refresh every N seconds
  refreshInterval?: number; // milliseconds
}

interface FileAnnotationsResult {
  annotations: UIAnnotation[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalPatches: number;
    patchesWithData: number;
    totalAnnotations: number;
    approvedCount: number;
    pendingCount: number;
    byLabel: Record<string, number>;
  };
  refetch: () => Promise<void>;
}

/**
 * Hook to load all annotations from local file storage
 * Aggregates annotations across all patches for a given item
 */
export function useFileAnnotations(options?: UseFileAnnotationsOptions): FileAnnotationsResult {
  const { itemId, autoRefresh = false, refreshInterval = 5000 } = options || {};

  const [annotations, setAnnotations] = useState<UIAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPatches: 0,
    patchesWithData: 0,
    totalAnnotations: 0,
    approvedCount: 0,
    pendingCount: 0,
    byLabel: {} as Record<string, number>
  });

  const fetchAnnotations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all patches data
      const response = await fetch('/api/annotations', {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch annotations: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      const patches = data.patches || {};

      // Filter patches by itemId if provided
      const relevantPatches = Object.entries(patches).filter(([patchId, _]) => {
        if (!itemId) return true;
        return patchId.startsWith(`${itemId}-patch-`);
      });

      // Aggregate all annotations
      const allAnnotations: UIAnnotation[] = [];
      let approvedCount = 0;
      let pendingCount = 0;
      const labelCounts: Record<string, number> = {};

      relevantPatches.forEach(([_, patchData]: [string, any]) => {
        const patchAnnotations = patchData.annotations || [];

        patchAnnotations.forEach((ann: UIAnnotation) => {
          allAnnotations.push(ann);

          // Count by status
          if (ann.isSaved) {
            approvedCount++;
          } else {
            pendingCount++;
          }

          // Count by label
          const labelName = ann.displayLabel || ann.classLabel || 'Unlabeled';
          labelCounts[labelName] = (labelCounts[labelName] || 0) + 1;
        });
      });

      setAnnotations(allAnnotations);
      setStats({
        totalPatches: relevantPatches.length,
        patchesWithData: relevantPatches.filter(([_, pd]: [string, any]) =>
          (pd.annotations || []).length > 0
        ).length,
        totalAnnotations: allAnnotations.length,
        approvedCount,
        pendingCount,
        byLabel: labelCounts
      });

      console.log('📊 Loaded file annotations:', {
        itemId,
        totalPatches: relevantPatches.length,
        totalAnnotations: allAnnotations.length,
        approved: approvedCount,
        pending: pendingCount
      });

    } catch (err: any) {
      console.error('Error loading file annotations:', err);
      setError(err.message || 'Failed to load annotations');
      setAnnotations([]);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Initial fetch
  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnnotations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnnotations]);

  return {
    annotations,
    isLoading,
    error,
    stats,
    refetch: fetchAnnotations
  };
}
