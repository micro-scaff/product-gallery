"use client";

import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  List,
  Space,
  Splitter,
  Tag,
  Typography,
} from "antd";
import { CommentOutlined, MobileOutlined, SendOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  authApi,
  type ChatBinding,
  chatsApi,
  flowTalkApi,
  type FlowTalkConversation,
  type FlowTalkLoginResult,
  type FlowTalkMessage,
} from "../api";
import { sampleChats } from "./mock";
import { WorkspaceHeader } from "./WorkspaceHeader";

type FlowTalkRuntime = {
  // Keep all temporary Flow Talk session pieces together so sendMessage does
  // not need to re-read Product Gallery auth state.
  baseURL: string;
  admin: FlowTalkLoginResult;
  peer: FlowTalkLoginResult;
  conversation: FlowTalkConversation;
};

// AdminChatsPage combines Product Gallery business bindings with the temporary
// Flow Talk demo-provider HTTP bridge.
export default function AdminChatsPage() {
  const { message } = App.useApp();
  const [chats, setChats] = useState<ChatBinding[]>(sampleChats);
  const [selectedId, setSelectedId] = useState(sampleChats[0]?.id);
  const [draft, setDraft] = useState("");
  const [flowTalk, setFlowTalk] = useState<FlowTalkRuntime | null>(null);
  const [flowMessages, setFlowMessages] = useState<FlowTalkMessage[]>([]);
  const [syncing, setSyncing] = useState(false);

  const selected = useMemo(
    // If the selected id disappears after refresh, keep the UI stable by
    // falling back to the first available chat.
    () => chats.find((chat) => chat.id === selectedId) ?? chats[0],
    [chats, selectedId],
  );

  // Load Product Gallery chat bindings; if the business API is unavailable,
  // sample data keeps the workspace renderable for UI review.
  async function loadChats() {
    try {
      const page = await chatsApi.list();
      setChats(page.items.length > 0 ? page.items : sampleChats);
      setSelectedId(page.items[0]?.id ?? sampleChats[0]?.id);
    } catch {
      message.info("后端未启动，聊天工作台展示本地示例会话。");
    }
  }

  // setupFlowTalk performs the temporary local integration:
  // 1. Product Gallery signs a stable external token.
  // 2. Flow Talk demo provider exchanges it for a Flow Talk JWT.
  // 3. A second demo peer is created so the admin can open a direct chat.
  async function setupFlowTalk() {
    setSyncing(true);
    try {
      const ticket = await authApi.adminFlowTalkToken();
      const baseURL = ticket.base_url || "http://127.0.0.1:8080";
      const admin = await flowTalkApi.externalLogin(baseURL, ticket.provider, ticket.token);
      // demo_peer_access_token simulates a C-end customer during local联调.
      const peer = await flowTalkApi.externalLogin(
        baseURL,
        ticket.provider,
        ticket.demo_peer_access_token || "product-gallery-demo-client",
      );
      const conversation = await flowTalkApi.createDirectConversation(
        baseURL,
        admin.token,
        peer.user.id,
      );
      // Read existing messages so refresh/reopen shows Flow Talk history rather
      // than a browser-only local transcript.
      const page = await flowTalkApi.listMessages(baseURL, admin.token, conversation.id);
      setFlowTalk({ baseURL, admin, peer, conversation });
      setFlowMessages(page.items);
      message.success("Flow Talk 临时联调已连接");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Flow Talk 联调失败");
    } finally {
      setSyncing(false);
    }
  }

  async function syncAll() {
    await loadChats();
    await setupFlowTalk();
  }

  // sendMessage writes to Flow Talk and only mutates the local stream after the
  // HTTP send succeeds. Failed sends restore the draft for retry.
  async function sendMessage() {
    if (!draft.trim()) {
      return;
    }
    if (!flowTalk) {
      message.warning("请先同步 Flow Talk 临时会话。");
      return;
    }
    const text = draft.trim();
    setDraft("");
    try {
      const sent = await flowTalkApi.sendTextMessage(
        flowTalk.baseURL,
        flowTalk.admin.token,
        flowTalk.conversation.id,
        text,
      );
      setFlowMessages((prev) => [...prev, sent]);
      message.success("消息已发送到 Flow Talk");
    } catch (error) {
      setDraft(text);
      message.error(error instanceof Error ? error.message : "发送失败");
    }
  }

  useEffect(() => {
    // The chat workspace bootstraps Product Gallery bindings and the temporary
    // Flow Talk demo conversation once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncAll();
    // 聊天页进入时同步业务会话，并建立 demo provider 的 Flow Talk 临时单聊。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="workspace chat-workspace">
      <WorkspaceHeader
        title="聊天工作台"
        description="PC 与手机浏览器共用一套路由页面处理商品咨询会话。"
        action={
          <Button icon={<MobileOutlined />} loading={syncing} onClick={syncAll}>
            同步 Flow Talk
          </Button>
        }
      />
      <Splitter className="chat-shell">
        <Splitter.Panel defaultSize="34%" min="260px">
          <List
            dataSource={chats}
            locale={{ emptyText: <Empty description="暂无会话" /> }}
            renderItem={(item) => (
              <List.Item
                className={item.id === selected?.id ? "chat-row active" : "chat-row"}
                onClick={() => setSelectedId(item.id)}
              >
                <List.Item.Meta
                  avatar={<CommentOutlined />}
                  title={item.product_title_snapshot}
                  description={
                    flowTalk
                      ? `${item.status} · Flow Talk #${flowTalk.conversation.id}`
                      : `${item.status} · ${item.flow_talk_conversation_id}`
                  }
                />
              </List.Item>
            )}
          />
        </Splitter.Panel>
        <Splitter.Panel>
          {selected ? (
            <div className="conversation">
              <Flex justify="space-between" align="center">
                <div>
                  <Typography.Title level={4}>
                    {selected.product_title_snapshot}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    接待管理员：{selected.receiver_admin_id}
                  </Typography.Text>
                </div>
                <Tag color="processing">{selected.status}</Tag>
              </Flex>
              <div className="message-stream">
                {flowMessages.length > 0 ? (
                  flowMessages.map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.sender_id === flowTalk?.admin.user.id
                          ? "bubble admin"
                          : "bubble user"
                      }
                    >
                      {item.content.text || "[非文本消息]"}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bubble user">Flow Talk 临时会话已准备好。</div>
                    <div className="bubble admin">发送一条消息即可写入本地 8080 通讯服务。</div>
                  </>
                )}
              </div>
              <Space.Compact className="composer">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="输入回复内容"
                  onPressEnter={() => void sendMessage()}
                />
                <Button type="primary" icon={<SendOutlined />} onClick={() => void sendMessage()}>
                  发送
                </Button>
              </Space.Compact>
            </div>
          ) : (
            <Empty description="请选择会话" />
          )}
        </Splitter.Panel>
      </Splitter>
    </main>
  );
}
