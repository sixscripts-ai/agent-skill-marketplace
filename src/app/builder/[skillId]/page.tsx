import { redirect } from "next/navigation";

export default async function EditBuilderAliasPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  redirect(`/projects/${encodeURIComponent(skillId)}`);
}
