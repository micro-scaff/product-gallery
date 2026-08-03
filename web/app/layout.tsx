import type { Metadata } from "next";
import "antd/dist/reset.css";
import "@uiw/react-markdown-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./globals.css";
import { AppShell } from "./components/AppShell";

// Metadata is shared by every App Router route.
export const metadata: Metadata = {
  title: "Product Gallery",
  description: "商品展示、管理后台和咨询聊天工作台",
};

// RootLayout installs global CSS, Ant Design reset styles and the auth-aware
// application shell around all pages.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
