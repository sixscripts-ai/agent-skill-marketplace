import { redirect } from "next/navigation";

export default async function InstallPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  redirect(`/skills/${skillId}?stage=distribution`);
}
