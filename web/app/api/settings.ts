import { request } from "../request";
import type { ChatSetting } from "./types";

// settingsApi contains system-level management settings.
export const settingsApi = {
  // Read the global chat switch used by products that inherit chat policy.
  getChatSetting() {
    return request<ChatSetting>("/api/admin/settings/chat");
  },

  // Persist the global chat switch.
  updateChatSetting(value: ChatSetting["value"]) {
    return request<ChatSetting>("/api/admin/settings/chat", {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });
  },
};
