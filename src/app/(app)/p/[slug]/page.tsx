import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProject, listAssets, listScreens, NotFound } from "@/lib/service";
import { Editor } from "@/components/editor/editor";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = (await getSessionUser())!;
  let project;
  try {
    project = await getProject(user.id, slug);
  } catch (e) {
    if (e instanceof NotFound) notFound();
    throw e;
  }
  const [assetRows, screenRows] = await Promise.all([
    listAssets(user.id, project.id),
    listScreens(user.id, project.id),
  ]);
  return (
    <Editor
      project={{ id: project.id, name: project.name, slug: project.slug }}
      initialAssets={assetRows.map((a) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        url: a.url,
        width: a.width,
        height: a.height,
      }))}
      initialScreens={screenRows.map((s) => ({
        id: s.id,
        locale: s.locale,
        device: s.device,
        position: s.position,
        scene: s.scene,
      }))}
    />
  );
}
