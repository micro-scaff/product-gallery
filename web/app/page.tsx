import ProductsPage from "./pages/ProductsPage";
import type { PageResult, Product } from "./api/types";
import { serverQuery, serverRequest } from "./request/server";

export const dynamic = "force-dynamic";

// The root route is the C-end product list entry, so visitors can open
// http://localhost:3000/ without an extra /products segment.
export default async function HomePage() {
  const page = await serverRequest<PageResult<Product>>(
    `/api/client/products?${serverQuery({ page: 1, page_size: 20 })}`,
  );
  return <ProductsPage initialProducts={page?.items} />;
}
