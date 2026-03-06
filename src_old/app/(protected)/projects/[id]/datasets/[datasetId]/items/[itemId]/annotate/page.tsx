'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnnotationEditor } from '@/features/annotations';
import { useDataset } from '@/features/datasets';
import { useProject } from '@/features/projects';
import type { ProjectId, DatasetId, DatasetItemId } from '@/types';

export default function AnnotatePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = params?.id as ProjectId;
  const datasetId = params?.datasetId as DatasetId;
  const itemId = params?.itemId as DatasetItemId;
  const tiffUrl = decodeURIComponent(searchParams?.get('uri') || '');

  const { data: currentProject } = useProject(projectId as string); //TanStack Query's destructuring syntax
  const { data: currentDataset } = useDataset(datasetId as string);


  return (
    <AnnotationEditor
      projectId={projectId}
      datasetId={datasetId}
      itemId={itemId}
      tiffUrl={tiffUrl}
      projectName={currentProject?.name}
      datasetName={currentDataset?.name}
      onBack={() => router.back()}
    />
  );
}
