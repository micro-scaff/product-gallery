import type {
  FlowTalkConversation,
  FlowTalkLoginResult,
  FlowTalkMessage,
  FlowTalkMessagePage,
} from "./types";

type FlowTalkEnvelope<T> = {
  code: number;
  data: T;
  message: string;
};

type FlowTalkRequestOptions = RequestInit & {
  token?: string;
};

async function flowTalkRequest<T>(
  baseURL: string,
  path: string,
  { token, ...init }: FlowTalkRequestOptions = {},
): Promise<T> {
  // Flow Talk is a separate local service, so it does not use the Product
  // Gallery request wrapper or response envelope. Keep the integration boundary
  // explicit here instead of hiding it behind the business API client.
  const response = await fetch(`${baseURL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as FlowTalkEnvelope<T>;
  // The current Flow Talk implementation returns code: 200 for success and
  // code >= 400 for failures. This check intentionally accepts any 2xx-style
  // application code below 400.
  if (!response.ok || payload.code >= 400) {
    throw new Error(payload.message || "Flow Talk 请求失败");
  }
  return payload.data;
}

// flowTalkApi is only the temporary demo-provider HTTP bridge. WebSocket
// realtime messaging can be added later without changing Product Gallery routes.
export const flowTalkApi = {
  // provider=demo + access_token logs in or creates an external Flow Talk user.
  externalLogin(baseURL: string, provider: string, accessToken: string) {
    return flowTalkRequest<FlowTalkLoginResult>(baseURL, "/api/auth/external", {
      method: "POST",
      body: JSON.stringify({
        provider,
        access_token: accessToken,
      }),
    });
  },

  // Create or reuse a direct conversation with the simulated peer user.
  createDirectConversation(baseURL: string, token: string, targetUserID: number) {
    return flowTalkRequest<FlowTalkConversation>(baseURL, "/api/conversations/direct", {
      method: "POST",
      token,
      body: JSON.stringify({
        target_user_id: targetUserID,
      }),
    });
  },

  // Read the latest message page after the temporary conversation is connected.
  listMessages(baseURL: string, token: string, conversationID: number) {
    return flowTalkRequest<FlowTalkMessagePage>(
      baseURL,
      "/api/conversations/messages/list",
      {
        method: "POST",
        token,
        body: JSON.stringify({
          conversation_id: conversationID,
          limit: 30,
        }),
      },
    );
  },

  // Flow Talk text messages expect content as an object, not a raw string.
  sendTextMessage(baseURL: string, token: string, conversationID: number, text: string) {
    return flowTalkRequest<FlowTalkMessage>(baseURL, "/api/conversations/messages", {
      method: "POST",
      token,
      body: JSON.stringify({
        conversation_id: conversationID,
        client_msg_id: `pg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message_type: "text",
        content: { text },
      }),
    });
  },
};
