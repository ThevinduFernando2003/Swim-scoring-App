import { redirect } from "next/navigation";

export default async function UploadAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/meets/${slug}/admin`);
}
