"use client";

import { App, Button, Form, Input, Typography } from "antd";
import { LoginOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "../api";
import {
  getStoredAdminAuth,
  saveStoredAdminAuth,
} from "../request/session";

type LoginForm = {
  username: string;
  password: string;
};

// AdminLoginPage stores the local Product Gallery session and then routes users
// to the default module available to their role.
export default function AdminLoginPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If a valid session already exists in localStorage, skip the login form.
    const auth = getStoredAdminAuth();
    if (auth) {
      router.replace(defaultAdminPath(auth.session.role));
    }
  }, [router]);

  // login persists both session and admin profile for nav/guard usage.
  async function login(values: LoginForm) {
    setLoading(true);
    try {
      const auth = await authApi.adminLogin(values);
      saveStoredAdminAuth(auth);
      message.success("登录成功");
      router.replace(defaultAdminPath(auth.session.role));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <Typography.Text className="eyebrow">Admin</Typography.Text>
        <Typography.Title level={1}>管理端登录</Typography.Title>
        <Typography.Paragraph>
          默认只展示 C 端内容；登录后按管理员角色展示可用模块。
        </Typography.Paragraph>
        <Form<LoginForm>
          layout="vertical"
          initialValues={{ username: "admin", password: "product-gallery" }}
          onFinish={login}
        >
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input placeholder="管理员账号" />
          </Form.Item>
          <Form.Item name="password" label="明文密码" rules={[{ required: true }]}>
            <Input.Password placeholder="管理员密码" />
          </Form.Item>
          <Button
            block
            type="primary"
            htmlType="submit"
            icon={<LoginOutlined />}
            loading={loading}
          >
            登录管理端
          </Button>
        </Form>
      </section>
    </main>
  );
}

// defaultAdminPath keeps post-login routing deterministic for every role.
function defaultAdminPath(role: string) {
  if (role === "super_admin" || role === "admin") {
    return "/admin/products";
  }
  return "/products";
}
