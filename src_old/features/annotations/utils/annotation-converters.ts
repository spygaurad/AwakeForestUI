import type {
  Annotation,
  UIAnnotation,
  AnnotationClass,
  AnnotationType,
} from '@/features/annotations/types';
import { toAnnotationGeometry } from './geometry-converter';
import { isPointGeometry, isPolygonGeometry } from './geometry-guards';
import { AnnotationSource } from '@/features/annotations/types';
import type { DatasetId, DatasetItemId, ProjectId } from '@/types';

/**
 * Convert API Annotation to UIAnnotation with inferred annotationType and displayLabel.
 * Returns null if geometry is unsupported.
 */

export function toUIAnnotation(
  apiAnnotation: Annotation,
  index: number,
  classes: AnnotationClass[]
): UIAnnotation | null {
  let annotationType: AnnotationType;

  const geometry = toAnnotationGeometry(apiAnnotation.geometry); // convert here

  if (isPointGeometry(geometry)) {
    annotationType = 'point';
  } else if (isPolygonGeometry(geometry)) {
    annotationType = 'polygon';
  } else {
    annotationType = 'bbox';
  }

  const classObj = classes.find(
    (c) => c.id === apiAnnotation.class_label || c.name === apiAnnotation.class_label
  );

  const displayLabel =
    apiAnnotation.properties?.display_label ??
    classObj?.name ??
    `${annotationType.toUpperCase()} #${index + 1}`;

  return {
    id: apiAnnotation.id,
    geometry,   // use converted geometry here!
    annotationType,
    classLabel: apiAnnotation.class_label,
    displayLabel,
    properties: apiAnnotation.properties,
    isSaved: true,
    isVisible: true,
  };
}


/**
 * Convert UIAnnotation to API AnnotationCreate payload (simplified, enum-safe)
 */
export function toAPIAnnotation(
  uiAnnotation: UIAnnotation,
  datasetId: DatasetId,
  datasetItemId: DatasetItemId,
  projectId: ProjectId
): Annotation {
  return {
    geometry: uiAnnotation.geometry,  // use converted geometry!
    annotation_type: uiAnnotation.annotationType === 'bbox' ? 'polygon' : uiAnnotation.annotationType,
    class_label: uiAnnotation.classLabel ?? 'Unknown',
    source: AnnotationSource.Human,
    properties: {
      ...uiAnnotation.properties,
      display_label: uiAnnotation.displayLabel,
    },
    dataset_id: datasetId,
    dataset_item_id: datasetItemId,
    project_id: projectId,
    created_at: '',
    updated_at: '',
    id: uiAnnotation.id as any, // handle temp ids if needed separately
  };
}