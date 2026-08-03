import ProductDetailPage from "../../pages/ProductDetailPage";
import type { Product } from "../../api/types";
import { serverRequest } from "../../request/server";

export const dynamic = "force-dynamic";

// Dynamic public product detail route.
export default async function ProductDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await serverRequest<Product>(`/api/client/products/${id}`);
  return <ProductDetailPage productId={id} initialProduct={product ?? undefined} />;
}
