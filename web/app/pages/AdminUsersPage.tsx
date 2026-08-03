"use client";

import { App, Button, List, Space, Tag, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { type User, usersApi } from "../api";
import { sampleUsers } from "./mock";
import { WorkspaceHeader } from "./WorkspaceHeader";

// AdminUsersPage lists C-end users and exposes a simple enable/disable action.
export default function AdminUsersPage({
  initialUsers = sampleUsers,
}: {
  initialUsers?: User[];
}) {
  const { message } = App.useApp();
  const [users, setUsers] = useState<User[]>(
    initialUsers.length > 0 ? initialUsers : sampleUsers,
  );

  async function refresh() {
    try {
      const page = await usersApi.list();
      // Keep samples visible if the local database is still empty.
      setUsers(page.items.length > 0 ? page.items : sampleUsers);
    } catch {
      message.info("后端未启动，用户管理展示本地示例数据。");
    }
  }

  // toggleStatus updates the local row with the backend response so table state
  // stays aligned with server-side validation.
  async function toggleStatus(user: User) {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      const updated = await usersApi.updateStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
      message.success("用户状态已更新");
    } catch {
      message.error("更新失败，请确认后端服务已启动。");
    }
  }

  return (
    <main className="workspace">
      <WorkspaceHeader
        title="用户管理"
        description="查看 C 端用户，处理启用、禁用和账号状态。"
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          </Space>
        }
      />
      <section className="table-panel">
        <Typography.Title level={5}>C 端用户</Typography.Title>
        <List
          dataSource={users}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="status" size="small" onClick={() => void toggleStatus(item)}>
                  {item.status === "active" ? "禁用" : "启用"}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.phone}
                description={`${item.id} · 最近登录：${item.last_login_at ?? "暂无"}`}
              />
              <Tag>{item.status}</Tag>
            </List.Item>
          )}
        />
      </section>
    </main>
  );
}
