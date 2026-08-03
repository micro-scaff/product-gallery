"use client";

import { App, Button, Radio, Space, Typography } from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { useState } from "react";
import { settingsApi, type ChatSetting } from "../api";
import { WorkspaceHeader } from "./WorkspaceHeader";

// AdminSettingsPage manages global settings available to super_admin.
export default function AdminSettingsPage({
  initialValue = "enabled",
}: {
  initialValue?: ChatSetting["value"];
}) {
  const { message } = App.useApp();
  const [value, setValue] = useState<ChatSetting["value"]>(initialValue);

  async function loadSetting() {
    try {
      const setting = await settingsApi.getChatSetting();
      setValue(setting.value);
    } catch {
      message.info("后端未启动，系统设置展示默认值。");
    }
  }

  // saveSetting persists the global chat switch. Product-level "inherit" reads
  // this setting through backend business logic.
  async function saveSetting() {
    try {
      const setting = await settingsApi.updateChatSetting(value);
      setValue(setting.value);
      message.success("聊天开关已保存");
    } catch {
      message.error("保存失败，请确认后端服务已启动。");
    }
  }

  return (
    <main className="workspace">
      <WorkspaceHeader
        title="系统设置"
        description="管理全局聊天策略，商品级策略在商品编辑中覆盖。"
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSetting}>
              刷新
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveSetting}>
              保存
            </Button>
          </Space>
        }
      />
      <section className="table-panel">
        <Typography.Title level={5}>全局聊天开关</Typography.Title>
        <Radio.Group
          value={value}
          onChange={(event) => setValue(event.target.value)}
          options={[
            { label: "启用聊天", value: "enabled" },
            { label: "禁用聊天", value: "disabled" },
          ]}
        />
      </section>
    </main>
  );
}
