'use client';

import { useState, useCallback } from 'react';
import { AnnotationClass } from '@/types/annotations';

const DEFAULT_CLASSES: AnnotationClass[] = [
  { id: 'default', name: 'Object', color: '#3b82f6' },
];

export function useAnnotationClasses() {
  const [classes, setClasses] = useState<AnnotationClass[]>(DEFAULT_CLASSES);

  const addClass = useCallback((name: string, color: string) => {
    const newClass: AnnotationClass = {
      id: `class-${Date.now()}`,
      name,
      color,
    };
    setClasses((prev) => [...prev, newClass]);
  }, []);

  return {
    classes,
    addClass,
  };
}
