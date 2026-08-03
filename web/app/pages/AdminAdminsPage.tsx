"use client";

import { App, Button, Form, Input, List, Modal, Space, Tag, Typography } from "antd";
import { PlusOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { adminsApi, type Admin } from "../api";
import { sampleAdmins } from "./mock";
import { WorkspaceHeader } from "./WorkspaceHeader";

// AdminAdminsPage is only reachable to super_admin through AdminGate.
export default function AdminAdminsPage({
  initialAdmins = sampleAdmins,
}: {
  initialAdmins?: Admin[];
}) {
  const { message } = App.useApp();
  const [admins, setAdmins] = useState<Admin[]>(
    initialAdmins.length > 0 ? initialAdmins : sampleAdmins,
  );
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ username: string; password: string }>();

  async function refresh() {
    try {
      const page = await adminsApi.list();
      // Empty database tables fall back to samples so first-run UI remains easy
      // to inspect before real data is added.
      setAdmins(page.items.length > 0 ? page.items : sampleAdmins);
    } catch {
      message.info("后端未启动，管理员管理展示本地示例数据。");
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
        <List
          dataSource={admins}
          renderItem={(item) => (
            <List.Item actions={[<Tag key={item.status}>{item.status}</Tag>]}>
              <List.Item.Meta
                avatar={<UserOutlined />}
                title={item.username}
                description={`${item.role} · ${item.id}`}
              />
            </List.Item>
          )}
        />
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
