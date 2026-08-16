"use client";

import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Space,
  Splitter,
  Tag,
  Typography,
} from "antd";
import { CommentOutlined, MobileOutlined, SendOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  authApi,
  type ChatBinding,
  chatsApi,
  flowTalkApi,
  type FlowTalkConversation,
  type FlowTalkLoginResult,
  type FlowTalkMessage,
} from "../api";
import { WorkspaceHeader } from "./WorkspaceHeader";

type FlowTalkRuntime = {
  // Keep all temporary Flow Talk session pieces together so sendMessage does
  // not need to re-read Product Gallery auth state.
  baseURL: string;
  admin: FlowTalkLoginResult;
  peer: FlowTalkLoginResult;
  conversation: FlowTalkConversation;
};

type SyncOptions = {
  notify?: boolean;
};

// AdminChatsPage combines Product Gallery business bindings with the temporary
// Flow Talk demo-provider HTTP bridge.
export default function AdminChatsPage() {
  const { message } = App.useApp();
  const [chats, setChats] = useState<ChatBinding[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [flowTalk, setFlowTalk] = useState<FlowTalkRuntime | null>(null);
  const [flowMessages, setFlowMessages] = useState<FlowTalkMessage[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const messageStreamRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    // If the selected id disappears after refresh, keep the UI stable by
    // falling back to the first available chat.
    () => chats.find((chat) => chat.id === selectedId) ?? chats[0],
    [chats, selectedId],
  );
  const orderedFlowMessages = useMemo(
    () => normalizeFlowTalkMessages(flowMessages),
    [flowMessages],
  );

  // Load Product Gallery chat bindings from the real business API.
  async function loadChats({ notify = false }: SyncOptions = {}) {
    try {
      const page = await chatsApi.list();
      setChats(page.items);
      setSelectedId(page.items[0]?.id);
      return page.items;
    } catch {
      if (notify) {
        message.info("后端未启动，暂无会话数据。");
      }
      return [];
    }
  }

  // setupFlowTalk performs the temporary local integration:
  // 1. Product Gallery signs a stable external token.
  // 2. Flow Talk demo provider exchanges it for a Flow Talk JWT.
  // 3. A second demo peer is created so the admin can open a direct chat.
  async function setupFlowTalk(chat: ChatBinding | undefined, { notify = false }: SyncOptions = {}) {
    if (!chat?.visitor_device_id) {
      setFlowTalk(null);
      setFlowMessages([]);
      if (notify) {
        message.warning("当前会话缺少游客设备，无法连接 Flow Talk。");
      }
      return;
    }
    setSyncing(true);
    try {
      const ticket = await authApi.adminFlowTalkToken();
      const visitorTicket = await authApi.clientFlowTalkToken(chat.visitor_device_id);
      const baseURL = visitorTicket.base_url || ticket.base_url || "http://127.0.0.1:8080";
      const admin = await flowTalkApi.externalLogin(baseURL, ticket.provider, ticket.token);
      // The C-end popup sends messages as this visitor identity. Connecting to
      // the same Flow Talk user lets B-end read the real message stream.
      const peer = await flowTalkApi.externalLogin(
        baseURL,
        visitorTicket.provider,
        visitorTicket.token,
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
      setFlowMessages(normalizeFlowTalkMessages(page.items));
      if (notify) {
        message.success("Flow Talk 临时联调已连接");
      }
    } catch (error) {
      if (notify) {
        message.error(error instanceof Error ? error.message : "Flow Talk 联调失败");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function syncAll(options: SyncOptions = {}) {
    if (syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    try {
      const items = await loadChats(options);
      const chat = items.find((item) => item.id === selectedId) ?? items[0];
      await setupFlowTalk(chat, options);
    } finally {
      syncingRef.current = false;
    }
  }

  async function openChat(chat: ChatBinding) {
    setSelectedId(chat.id);
    await setupFlowTalk(chat, { notify: false });
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
      setFlowMessages((prev) => normalizeFlowTalkMessages([...prev, sent]));
    } catch (error) {
      setDraft(text);
      message.error(error instanceof Error ? error.message : "发送失败");
    }
  }

  useEffect(() => {
    // The chat workspace bootstraps Product Gallery bindings and the temporary
    // Flow Talk demo conversation once after hydration.
    void syncAll({ notify: false });
    // 聊天页进入时同步业务会话，并建立 demo provider 的 Flow Talk 临时单聊。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flowTalk) {
      return;
    }
    const timer = window.setInterval(() => {
      void flowTalkApi
        .listMessages(flowTalk.baseURL, flowTalk.admin.token, flowTalk.conversation.id)
        .then((page) => setFlowMessages(normalizeFlowTalkMessages(page.items)))
        .catch(() => {
          // Polling is intentionally quiet; the manual sync button is still the
          // visible recovery action when local Flow Talk is unavailable.
        });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [flowTalk]);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (messageStreamRef.current) {
        messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected, orderedFlowMessages]);

  return (
    <main className="workspace chat-workspace">
      <WorkspaceHeader
        title="聊天工作台"
        description="PC 与手机浏览器共用一套路由页面处理商品咨询会话。"
        action={
          <Button
            icon={<MobileOutlined />}
            loading={syncing}
            onClick={() => void syncAll({ notify: true })}
          >
            同步 Flow Talk
          </Button>
        }
      />
      <Splitter className="chat-shell">
        <Splitter.Panel defaultSize="34%" min="260px">
          {chats.length === 0 ? (
            <Empty className="empty-panel" description="暂无会话" />
          ) : (
            <ul className="plain-list chat-list">
              {chats.map((item) => (
                <li
                  key={item.id}
                  className={item.id === selected?.id ? "chat-row active entity-row" : "chat-row entity-row"}
                  onClick={() => void openChat(item)}
                >
                  <div className="entity-meta">
                    <CommentOutlined className="entity-icon" />
                    <div className="entity-copy">
                      <Typography.Text strong>{item.product_title_snapshot}</Typography.Text>
                      <Typography.Text type="secondary">
                        {flowTalk
                          ? `${item.status} · Flow Talk #${flowTalk.conversation.id}`
                          : `${item.status} · ${item.flow_talk_conversation_id}`}
                      </Typography.Text>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
              <div className="message-stream" ref={messageStreamRef}>
                {orderedFlowMessages.length > 0 ? (
                  orderedFlowMessages.map((item) => (
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

function normalizeFlowTalkMessages(messages: FlowTalkMessage[]) {
  const byID = new Map<number, FlowTalkMessage>();
  messages.forEach((item) => {
    byID.set(Number(item.id), item);
  });
  return Array.from(byID.values()).sort((a, b) => Number(a.id) - Number(b.id));
}
