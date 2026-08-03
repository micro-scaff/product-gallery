import type { Admin, ChatBinding, Product, User } from "../api";

// Sample data keeps every page visually reviewable before the local Go backend
// and MySQL database have been started.
export const sampleProducts: Product[] = [
  {
    id: "sample-1",
    title: "北欧白橡木餐桌",
    summary: "适合 4-6 人用餐的温润木质餐桌，支持商品咨询。",
    price: 3280,
    cover_url:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    detail_md:
      "### 商品亮点\n\n- 白橡木纹理\n- 圆角边缘\n- 适合家庭餐厅和小型会客空间",
    status: "published",
    chat_policy: "inherit",
  },
  {
    id: "sample-2",
    title: "模块化展示柜",
    summary: "面向零售陈列的小型组合柜，可自由组合。",
    price: 1699,
    cover_url:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    detail_md: "### 展示柜\n\n适合商品展示、样品陈列和空间分区。",
    status: "published",
    chat_policy: "enabled",
  },
];

export const sampleAdmins: Admin[] = [
  { id: "adm_super", role: "super_admin", username: "admin", status: "active" },
  { id: "adm_demo", role: "admin", username: "operator", status: "active" },
];

export const sampleUsers: User[] = [
  {
    id: "usr_demo",
    phone: "13800000000",
    status: "active",
    last_login_at: "2026-08-02T20:00:00+08:00",
  },
];

export const sampleChats: ChatBinding[] = [
  {
    id: "cht_demo",
    product_id: "sample-1",
    product_title_snapshot: "北欧白橡木餐桌",
    receiver_admin_id: "adm_super",
    flow_talk_conversation_id: "flow_demo",
    status: "open",
    last_message_at: "2026-08-02T20:30:00+08:00",
  },
];
