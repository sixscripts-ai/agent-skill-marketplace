import { redirect } from "next/navigation";

export default async function EvalsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/skills/${slug}?stage=package&evidence=evals`);
}
