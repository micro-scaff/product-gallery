import { buildQuery, request } from "../request";
import type { PageResult, User } from "./types";

// usersApi powers the management C-end user list.
export const usersApi = {
  // List users with shared pagination.
  list(params = { page: 1, page_size: 20 }) {
    return request<PageResult<User>>(`/api/admin/users?${buildQuery(params)}`);
  },

  // Toggle active/disabled state from the admin workspace.
  updateStatus(id: string, status: User["status"]) {
    return request<User>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
