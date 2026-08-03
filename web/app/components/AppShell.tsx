"use client";

import {
  App,
  ConfigProvider,
  Button,
  Layout,
  Space,
  Typography,
  theme,
} from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  MessageOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { authApi, type AdminRole } from "../api";
import {
  clearStoredAdminAuth,
  getStoredAdminAuth,
  type StoredAdminAuth,
} from "../request/session";

// navItems is the single source of truth for top-level module visibility.
// Guests only see C-end content; admin modules appear after local login.
const navItems = [
  { href: "/products", label: "C 端商品", icon: <ShopOutlined />, roles: ["guest", "admin", "super_admin"] },
  { href: "/admin/products", label: "商品管理", icon: <ShopOutlined />, roles: ["admin", "super_admin"] },
  { href: "/admin/admins", label: "管理员", icon: <TeamOutlined />, roles: ["super_admin"] },
  { href: "/admin/users", label: "用户", icon: <UserOutlined />, roles: ["admin", "super_admin"] },
  { href: "/admin/chats", label: "聊天", icon: <MessageOutlined />, roles: ["admin", "super_admin"] },
  { href: "/admin/settings", label: "设置", icon: <SettingOutlined />, roles: ["super_admin"] },
];

// AppShell provides Ant Design theme, top navigation and auth-aware module
// visibility for every route in the Next.js App Router.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [adminAuth, setAdminAuth] = useState<StoredAdminAuth | null>(null);
  const role: AdminRole | "guest" = adminAuth?.session.role ?? "guest";
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(role)),
    [role],
  );

  useEffect(() => {
    // Keep navigation in sync with login/logout both inside the same tab and
    // across browser tabs.
    function syncAuth() {
      setAdminAuth(getStoredAdminAuth());
    }
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("product-gallery-auth-change", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("product-gallery-auth-change", syncAuth);
    };
  }, []);

  // Logout clears both server memory and browser storage; the finally branch
  // keeps the UI recoverable even if the local backend is not running.
  async function logout() {
    try {
      await authApi.adminLogout();
    } finally {
      clearStoredAdminAuth();
      window.location.href = "/products";
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorInfo: "#176b87",
          colorPrimary: "#176b87",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        },
      }}
    >
      <App>
        <Layout className="app-shell">
          <header className="topbar">
            <Link href="/products" className="brand-link">
              <Space size={12} align="center">
                <ShopOutlined className="brand-mark" />
                <div>
                  <Typography.Title level={4} className="brand-title">
                    Product Gallery
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    商品展示、管理后台与咨询工作台
                  </Typography.Text>
                </div>
              </Space>
            </Link>
            <nav className="topnav" aria-label="主导航">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "topnav-item active" : "topnav-item"}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              {adminAuth ? (
                <Button size="small" icon={<LogoutOutlined />} onClick={() => void logout()}>
                  退出
                </Button>
              ) : pathname.startsWith("/admin") ? (
                <Link
                  href="/admin/login"
                  className={pathname === "/admin/login" ? "topnav-item active" : "topnav-item"}
                >
                  <LoginOutlined />
                  <span>管理登录</span>
                </Link>
              ) : null}
            </nav>
          </header>
          {children}
        </Layout>
      </App>
    </ConfigProvider>
  );
}
