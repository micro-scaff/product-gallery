import { AdminGate } from "../../../components/AdminGate";
import AdminProductDetailPage from "../../../pages/AdminProductDetailPage";
import type { Product } from "../../../api/types";
import { serverRequest } from "../../../request/server";

export const dynamic = "force-dynamic";

// Dynamic admin product route; params are awaited for Next.js App Router.
export default async function AdminProductDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await serverRequest<Product>(`/api/admin/products/${id}`);
  return (
    <AdminGate>
      <AdminProductDetailPage productId={id} initialProduct={product ?? undefined} />
    </AdminGate>
  );
}
