import ProductsPage from "../pages/ProductsPage";
import type { PageResult, Product } from "../api/types";
import { serverQuery, serverRequest } from "../request/server";

export const dynamic = "force-dynamic";

// Public product list route.
export default async function ProductsRoute() {
  const page = await serverRequest<PageResult<Product>>(
    `/api/client/products?${serverQuery({ page: 1, page_size: 20 })}`,
  );
  return <ProductsPage initialProducts={page?.items} />;
}
