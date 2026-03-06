import { useMutation, useQueryClient } from '@tanstack/react-query';
import { annotationsApi } from '@/lib/api';
import type { AnnotationCreate, Annotation } from '@/features/annotations/types';

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation<Annotation, Error, AnnotationCreate>({
    mutationFn: (newAnnotation: AnnotationCreate) =>
      annotationsApi.create(newAnnotation),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'annotations',
      });
    },
  });
}