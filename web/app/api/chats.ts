import { buildQuery, request } from "../request";
import type { ChatBinding, PageResult } from "./types";

// chatsApi works with Product Gallery chat bindings. Actual message transport
// is delegated to Flow Talk through flowTalkApi.
export const chatsApi = {
  // List business chat bindings for the admin workspace.
  list(params = { page: 1, page_size: 20 }) {
    return request<PageResult<ChatBinding>>(`/api/admin/chats?${buildQuery(params)}`);
  },

  // Load one binding if a future detail page needs full product context.
  detail(id: string) {
    return request<ChatBinding>(`/api/admin/chats/${id}`);
  },

  // Placeholder action for unread state; kept so the UI/API shape is ready.
  markRead(id: string) {
    return request<ChatBinding>(`/api/admin/chats/${id}/read`, {
      method: "POST",
    });
  },
};
