"use client";

import { Button, Result } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AdminRole } from "../api";
import {
  canAccessAdminPath,
  getStoredAdminAuth,
  type StoredAdminAuth,
} from "../request/session";

// AdminGate is a light client-side guard for the first-stage implementation.
// It matches the current requirement: admin modules are shown by login role,
// while most hard authorization stays intentionally simple on the backend.
export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAdminAuth | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The guard must read browser-only localStorage after hydration before it
    // can decide whether to render protected admin content or redirect.
    const storedAuth = getStoredAdminAuth();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuth(storedAuth);
    setReady(true);
    if (!storedAuth) {
      router.replace("/admin/login");
    }
  }, [router]);

  if (!ready) {
    return null;
  }

  const role = auth?.session.role ?? null;
  if (!canAccessAdminPath(pathname, role)) {
    return (
      <main className="workspace">
        <Result
          status="403"
          title="无权限访问"
          subTitle={`${roleLabel(role)}暂不能访问当前管理模块。`}
          extra={
            <Link href="/admin/products">
              <Button type="primary">返回商品管理</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return <>{children}</>;
}

// roleLabel turns compact API role values into user-facing Chinese copy.
function roleLabel(role: AdminRole | null) {
  if (role === "super_admin") {
    return "超级管理员";
  }
  if (role === "admin") {
    return "普通管理员";
  }
  return "未登录用户";
}
