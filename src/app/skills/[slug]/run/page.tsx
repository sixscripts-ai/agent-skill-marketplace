import { redirect } from "next/navigation";

export default async function SkillRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ replay?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const { replay, mode } = await searchParams;
  const query = new URLSearchParams({ stage: "sandbox" });
  if (replay) query.set("replay", replay);
  redirect(`/skills/${slug}?${query.toString()}`);
}
