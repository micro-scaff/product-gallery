import { AdminGate } from "../../components/AdminGate";
import AdminProductsPage from "../../pages/AdminProductsPage";
import type { PageResult, Product } from "../../api/types";
import { serverQuery, serverRequest } from "../../request/server";

export const dynamic = "force-dynamic";

// Product management list route.
export default async function AdminProductsRoute() {
  const page = await serverRequest<PageResult<Product>>(
    `/api/admin/products?${serverQuery({ page: 1, page_size: 20 })}`,
  );
  return (
    <AdminGate>
      <AdminProductsPage initialProducts={page?.items} />
    </AdminGate>
  );
}
