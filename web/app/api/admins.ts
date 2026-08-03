import { buildQuery, request } from "../request";
import type { Admin, PageResult } from "./types";

// adminsApi contains super-admin-only management calls. Role visibility is
// mainly handled in the frontend gate, while the backend still validates data.
export const adminsApi = {
  // Fetch the management table with the shared page/page_size convention.
  list(params = { page: 1, page_size: 20 }) {
    return request<PageResult<Admin>>(`/api/admin/admins?${buildQuery(params)}`);
  },

  // Create an ordinary admin. Password remains plaintext by business decision.
  create(payload: { username: string; password: string }) {
    return request<Admin>("/api/admin/admins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
