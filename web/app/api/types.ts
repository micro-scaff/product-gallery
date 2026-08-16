// PageResult mirrors the backend's shared pagination response.
export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

// Product is shared by C-end detail/list pages and the admin editor.
export type Product = {
  id: string;
  title: string;
  summary: string;
  price?: number | null;
  cover_url?: string;
  detail_md: string;
  owner_admin_id?: string;
  status: "draft" | "published" | "offline" | "deleted";
  chat_policy: "inherit" | "enabled" | "disabled";
  updated_at?: string;
};

// ProductPayload is the editable subset sent by create/update forms.
export type ProductPayload = {
  title: string;
  summary: string;
  price?: number;
  detail_md?: string;
  cover_url?: string;
  owner_admin_id?: string;
  chat_policy?: Product["chat_policy"];
};

// Admin describes management users shown in the top nav and admin module.
export type Admin = {
  id: string;
  role: "super_admin" | "admin";
  username: string;
  status: "active" | "disabled";
};

export type AdminRole = Admin["role"];

// AdminSession is stored locally and also used to inject Authorization headers.
export type AdminSession = {
  token: string;
  actor_id: string;
  actor_type: "admin";
  role: AdminRole;
  expires_at: string;
};

// AdminLoginResult is the full login response persisted in localStorage.
export type AdminLoginResult = {
  session: AdminSession;
  admin: Admin;
};

// User is the C-end account shape used by the management user list.
export type User = {
  id: string;
  phone: string;
  avatar_url?: string;
  status: "active" | "disabled";
  last_login_at?: string;
};

// ChatBinding is Product Gallery's business context around a Flow Talk chat.
export type ChatBinding = {
  id: string;
  product_id: string;
  product_title_snapshot: string;
  visitor_device_id?: string;
  user_id?: string;
  receiver_admin_id: string;
  flow_talk_conversation_id: string;
  status: "open" | "readonly" | "closed";
  last_message_at?: string;
};

export type ProductChatMessageResult = {
  chat: ChatBinding;
  message: FlowTalkMessage;
  flow_talk_conversation_id: string;
};

// ChatSetting stores the global chat policy row.
export type ChatSetting = {
  key: string;
  value: "enabled" | "disabled";
};

// Captcha is returned as an id plus base64 image string.
export type Captcha = {
  captcha_id: string;
  captcha_image: string;
};

// FlowTalkToken is the bridge payload from Product Gallery to Flow Talk.
export type FlowTalkToken = {
  provider: string;
  token: string;
  actor: string;
  type: string;
  base_url: string;
  demo_peer_access_token?: string;
};

// FlowTalkUser mirrors the local Flow Talk server's external user DTO.
export type FlowTalkUser = {
  id: number;
  external_id: string;
  username: string;
  nickname: string;
  auth_source: "external" | "local";
  status: number;
};

// FlowTalkLoginResult contains the Flow Talk JWT used for chat APIs.
export type FlowTalkLoginResult = {
  user: FlowTalkUser;
  token: string;
};

// FlowTalkConversation is the direct chat room created for temporary联调.
export type FlowTalkConversation = {
  id: number;
  type: "direct" | "group";
  title?: string;
  target_user?: FlowTalkUser;
  last_message_at?: string;
};

// FlowTalkMessage is intentionally loose enough to show text/file/image shapes.
export type FlowTalkMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  client_msg_id?: string;
  message_type: "text" | "image" | "file" | string;
  content: {
    text?: string;
    url?: string;
    name?: string;
  };
  status: string;
  sent_at: string;
};

// FlowTalkMessagePage is the paginated message history response.
export type FlowTalkMessagePage = {
  items: FlowTalkMessage[];
  next_before_id: number;
  has_more: boolean;
};
