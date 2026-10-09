import { projectAccess } from "@/features/maintenance/queries";

// Every page under /p/[projectId] is "not found" unless the user may see the project.
export default async function ProjectLayout({ children, params }: LayoutProps<"/p/[projectId]">) {
  const { projectId } = await params;
  await projectAccess(projectId);
  return children;
}
