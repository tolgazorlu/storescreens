import { listProjectSummaries } from "@/lib/service";
import { ProjectsView } from "@/components/projects-view";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const rows = await listProjectSummaries();
  return (
    <ProjectsView
      projects={rows.map(({ project: p, screenCount, locales, cover }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        updatedAt: p.updatedAt.toISOString(),
        screenCount,
        locales,
        cover,
      }))}
    />
  );
}
