import { getSessionUser } from "@/lib/auth";
import { listProjects } from "@/lib/service";
import { ProjectsView } from "@/components/projects-view";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = (await getSessionUser())!;
  const rows = await listProjects(user.id);
  return (
    <ProjectsView
      projects={rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
