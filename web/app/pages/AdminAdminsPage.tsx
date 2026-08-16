"use client";

import { App, Button, Empty, Form, Input, Modal, Space, Tag, Typography } from "antd";
import { PlusOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { adminsApi, type Admin } from "../api";
import { WorkspaceHeader } from "./WorkspaceHeader";

// AdminAdminsPage is only reachable to super_admin through AdminGate.
export default function AdminAdminsPage({
  initialAdmins = [],
}: {
  initialAdmins?: Admin[];
}) {
  const { message } = App.useApp();
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ username: string; password: string }>();

  async function refresh() {
    try {
      const page = await adminsApi.list();
      setAdmins(page.items);
    } catch {
      message.info("后端未启动，暂无管理员数据。");
    }
  }

  async function createAdmin(values: { username: string; password: string }) {
    try {
      const admin = await adminsApi.create(values);
      // Optimistically place the new admin at the top, matching server ordering.
      setAdmins((prev) => [admin, ...prev]);
      message.success("管理员已创建");
      setOpen(false);
      form.resetFields();
    } catch {
      message.error("创建失败，请确认后端服务已启动。");
    }
  }

  return (
    <main className="workspace">
      <WorkspaceHeader
        title="管理员管理"
        description="超级管理员在这里创建普通管理员、查看状态并做账号维护。"
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              新建管理员
            </Button>
          </Space>
        }
      />
      <section className="table-panel">
        <Typography.Title level={5}>管理员列表</Typography.Title>
        {admins.length === 0 ? (
          <Empty description="暂无管理员" />
        ) : (
          <ul className="plain-list">
            {admins.map((item) => (
              <li key={item.id} className="entity-row">
                <div className="entity-meta">
                  <UserOutlined className="entity-icon" />
                  <div className="entity-copy">
                    <Typography.Text strong>{item.username}</Typography.Text>
                    <Typography.Text type="secondary">
                      {item.role} · {item.id}
                    </Typography.Text>
                  </div>
                </div>
                <Tag>{item.status}</Tag>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Modal
        title="创建管理员"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={createAdmin}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input placeholder="管理员账号" />
          </Form.Item>
          <Form.Item name="password" label="明文密码" rules={[{ required: true }]}>
            <Input.Password placeholder="按业务要求明文保存" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
