import { redirect } from "next/navigation";

export default async function VersionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/skills/${slug}?stage=package&evidence=versions`);
}
