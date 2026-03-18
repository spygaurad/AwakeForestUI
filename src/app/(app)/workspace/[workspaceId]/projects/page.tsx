import { ProjectsContent } from './_components/ProjectsContent';

export const metadata = { title: 'Projects — AwakeForest' };

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <ProjectsContent workspaceId={workspaceId} />;
}
