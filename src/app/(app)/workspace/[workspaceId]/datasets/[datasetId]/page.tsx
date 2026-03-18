import { Suspense } from 'react';
import { DatasetDetailContent } from './_components/DatasetDetailContent';

interface Props {
  params: Promise<{ workspaceId: string; datasetId: string }>;
}

export default async function DatasetDetailPage({ params }: Props) {
  const { workspaceId, datasetId } = await params;
  return (
    <Suspense>
      <DatasetDetailContent workspaceId={workspaceId} datasetId={datasetId} />
    </Suspense>
  );
}
