import { Suspense } from 'react';
import { DatasetsContent } from './_components/DatasetsContent';

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function DatasetsPage({ params }: Props) {
  const { workspaceId } = await params;
  return (
    <Suspense>
      <DatasetsContent workspaceId={workspaceId} />
    </Suspense>
  );
}

export const metadata = { title: 'Datasets' };
