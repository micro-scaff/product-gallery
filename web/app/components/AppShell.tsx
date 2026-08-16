"use client";

import { App, ConfigProvider, Layout, theme } from "antd";
import { LoginOutlined, ProductOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getStoredAdminAuth } from "../request/session";

// AppShell keeps only global providers and layout surface. The product does not
// use a persistent header/search bar; every route owns its own visual entrance.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hasAdminAuth, setHasAdminAuth] = useState(false);
  const showAdminEntry = !pathname.startsWith("/admin");

  useEffect(() => {
    function syncAuth() {
      setHasAdminAuth(Boolean(getStoredAdminAuth()));
    }
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("product-gallery-auth-change", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("product-gallery-auth-change", syncAuth);
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 10,
          colorInfo: "#1877f2",
          colorPrimary: "#1877f2",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        },
      }}
    >
      <App>
        <Layout className="app-shell">
          {showAdminEntry ? (
            <Link
              href={hasAdminAuth ? "/admin/products" : "/admin/login"}
              className="admin-entry"
              aria-label={hasAdminAuth ? "进入管理后台" : "管理员登录"}
            >
              {hasAdminAuth ? <ProductOutlined /> : <LoginOutlined />}
              <span>{hasAdminAuth ? "进入后台" : "管理员登录"}</span>
            </Link>
          ) : null}
          {children}
        </Layout>
      </App>
    </ConfigProvider>
  );
}
