import { notFound, redirect } from "next/navigation";

import { getProductDetail } from "@/application/catalog/queries";

type FallbackProductPageProps = {
  params: Promise<{ productSlug: string }>;
};

export default async function FallbackProductPage({
  params,
}: FallbackProductPageProps) {
  const resolvedParams = await params;
  const detail = await getProductDetail(resolvedParams.productSlug);

  if (!detail) {
    notFound();
  }

  const targetCategory = detail.product.categorySlug ?? "catalog";
  redirect(`/catalog/${targetCategory}/${detail.product.slug}`);
}
