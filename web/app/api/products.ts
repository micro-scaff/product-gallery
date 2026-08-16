import { buildQuery, request } from "../request";
import type {
  ChatBinding,
  PageResult,
  Product,
  ProductChatMessageResult,
  ProductPayload,
} from "./types";

type MutationResult = {
  ok: boolean;
};

// clientProductsApi powers the default C-end product routes.
export const clientProductsApi = {
  // Only published products are returned by the backend on this route.
  list(params = { page: 1, page_size: 20 }) {
    return request<PageResult<Product>>(
      `/api/client/products?${buildQuery(params)}`,
    );
  },

  // Load a public product detail page by route id.
  detail(id: string) {
    return request<Product>(`/api/client/products/${id}`);
  },

  // Create or reuse the Product Gallery business chat binding before Flow Talk
  // handles actual messages.
  createChat(productId: string, visitorDeviceId: string) {
    return request<ChatBinding>(`/api/client/products/${productId}/chat`, {
      method: "POST",
      body: JSON.stringify({ visitor_device_id: visitorDeviceId }),
    });
  },

  // Send a C-end popup message through Product Gallery into Flow Talk so the
  // B-end conversation workspace can read the same message stream.
  sendChatMessage(productId: string, visitorDeviceId: string, text: string) {
    return request<ProductChatMessageResult>(`/api/client/products/${productId}/chat/messages`, {
      method: "POST",
      body: JSON.stringify({
        visitor_device_id: visitorDeviceId,
        text,
      }),
    });
  },
};

// adminProductsApi powers the management product workspace.
export const adminProductsApi = {
  // Management lists drafts, offline items and published products.
  list(params = { page: 1, page_size: 20 }) {
    return request<PageResult<Product>>(`/api/admin/products?${buildQuery(params)}`);
  },

  // Management detail can load non-deleted products regardless of status.
  detail(id: string) {
    return request<Product>(`/api/admin/products/${id}`);
  },

  // Create a draft product from the modal form.
  create(payload: ProductPayload) {
    return request<Product>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Partial update; omitted fields are left unchanged by the backend service.
  update(id: string, payload: Partial<ProductPayload>) {
    return request<Product>(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Make the product visible to C-end visitors.
  publish(id: string) {
    return request<MutationResult>(`/api/admin/products/${id}/publish`, {
      method: "POST",
    });
  },

  // Hide the product without deleting its history.
  offline(id: string) {
    return request<MutationResult>(`/api/admin/products/${id}/offline`, {
      method: "POST",
    });
  },
};
