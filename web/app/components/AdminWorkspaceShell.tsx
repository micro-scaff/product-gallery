"use client";

import { MessageOutlined, ProductOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type AdminRoute = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const adminRoutes: AdminRoute[] = [
  {
    href: "/admin/products",
    label: "商品管理",
    description: "创建、编辑、上下架",
    icon: <ProductOutlined />,
  },
  {
    href: "/admin/chats",
    label: "对话管理",
    description: "查看咨询与回复消息",
    icon: <MessageOutlined />,
  },
];

// AdminWorkspaceShell gives the B-side a stable two-module route frame. The
// guard still lives outside this component, so the shell can stay focused on
// navigation and layout rather than auth decisions.
export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="admin-workspace-shell">
      <aside className="admin-sidebar" aria-label="管理后台模块导航">
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-mark">PG</span>
          <div>
            <strong>Product Gallery</strong>
            <span>管理后台</span>
          </div>
        </div>

        <nav className="admin-side-nav">
          {adminRoutes.map((route) => {
            const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={active ? "admin-side-link active" : "admin-side-link"}
              >
                <span className="admin-side-icon">{route.icon}</span>
                <span className="admin-side-copy">
                  <strong>{route.label}</strong>
                  <small>{route.description}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="admin-workspace-content">{children}</div>
    </section>
  );
}
