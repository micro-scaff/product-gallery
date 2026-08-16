"use client";

import {
  App,
  Button,
  Descriptions,
  Divider,
  Input,
  Result,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, CloseOutlined, MessageOutlined, SendOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  authApi,
  clientProductsApi,
  flowTalkApi,
  type ChatBinding,
  type FlowTalkLoginResult,
  type FlowTalkMessage,
  type Product,
} from "../api";
import { MarkdownPreviewBox } from "../components/MarkdownEditorField";
import { money } from "./format";

type ClientChatMessage = {
  id: string;
  role: "system" | "visitor" | "admin";
  text: string;
};

type ClientFlowTalkRuntime = {
  baseURL: string;
  visitor: FlowTalkLoginResult;
  conversationID: number;
};

// ProductDetailPage shows public Markdown content and starts the consultation
// flow for visitors or logged-in C-end users.
export default function ProductDetailPage({
  initialProduct,
}: {
  productId: string;
  initialProduct?: Product;
}) {
  const { message } = App.useApp();
  const product = initialProduct;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatBinding, setChatBinding] = useState<ChatBinding | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ClientChatMessage[]>([]);
  const [visitorDeviceId, setVisitorDeviceId] = useState<string>();
  const [clientFlowTalk, setClientFlowTalk] = useState<ClientFlowTalkRuntime | null>(null);
  const chatStreamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatOpen || !clientFlowTalk) {
      return;
    }
    const timer = window.setInterval(() => {
      void flowTalkApi
        .listMessages(clientFlowTalk.baseURL, clientFlowTalk.visitor.token, clientFlowTalk.conversationID)
        .then((page) => {
          if (page.items.length > 0) {
            setChatMessages(mapFlowTalkMessages(page.items, clientFlowTalk.visitor.user.id));
          }
        })
        .catch(() => {
          // Keep polling quiet. The composer send action will still surface
          // concrete errors if the local Flow Talk service is down.
        });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [chatOpen, clientFlowTalk]);

  useEffect(() => {
    if (!chatOpen) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (chatStreamRef.current) {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatOpen, chatMessages, chatLoading]);

  if (!product) {
    return (
      <main className="product-detail-empty">
        <Result
          status="404"
          title="商品不存在或未上架"
          subTitle="请返回商品列表选择一个真实的已上架商品。"
          extra={
            <Link href="/products">
              <Button type="primary">返回商品列表</Button>
            </Link>
          }
        />
      </main>
    );
  }
  const currentProduct = product;

  // FingerprintJS gives anonymous visitors a stable local device id. It is
  // resolved lazily when the user starts chat, keeping SSR/product rendering
  // free of browser-only side effects.
  async function resolveDeviceId() {
    try {
      const fp = await import("@fingerprintjs/fingerprintjs");
      const agent = await fp.default.load();
      const result = await agent.get();
      return result.visitorId;
    } catch {
      return `visitor-${Math.random().toString(16).slice(2)}`;
    }
  }

  // ensureBusinessChat creates or reuses the Product Gallery chat binding.
  // Flow Talk realtime UI can later open from the returned binding.
  async function ensureBusinessChat() {
    if (chatBinding || chatLoading) {
      return chatBinding;
    }
    setChatLoading(true);
    try {
      const deviceId = visitorDeviceId ?? (await resolveDeviceId());
      setVisitorDeviceId(deviceId);
      const chat = await clientProductsApi.createChat(currentProduct.id, deviceId);
      setChatBinding(chat);
      setChatMessages([
        {
          id: "welcome",
          role: "system",
          text: "你好，商品咨询已接入。请留下你的问题，管理员会在对话管理中处理。",
        },
      ]);
      const conversationID = flowTalkConversationID(chat);
      if (conversationID) {
        await connectClientFlowTalk(deviceId, conversationID);
      }
      message.success("已创建或复用商品咨询会话");
      return chat;
    } catch {
      setChatMessages([
        {
          id: "offline",
          role: "system",
          text: "当前暂时无法连接聊天接口，你仍可以浏览商品详情，稍后再试。",
        },
      ]);
      message.warning("当前无法连接聊天接口，已保留咨询入口。");
      return null;
    } finally {
      setChatLoading(false);
    }
  }

  async function startChat() {
    setChatOpen(true);
    await ensureBusinessChat();
  }

  // connectClientFlowTalk lets the C-end popup read the same Flow Talk direct
  // conversation that B-end operators use for replies.
  async function connectClientFlowTalk(deviceId: string, conversationID: number) {
    const ticket = await authApi.clientFlowTalkToken(deviceId);
    const baseURL = ticket.base_url || "http://127.0.0.1:8080";
    const visitor = await flowTalkApi.externalLogin(baseURL, ticket.provider, ticket.token);
    const page = await flowTalkApi.listMessages(baseURL, visitor.token, conversationID);
    setClientFlowTalk({ baseURL, visitor, conversationID });
    if (page.items.length > 0) {
      setChatMessages(mapFlowTalkMessages(page.items, visitor.user.id));
    }
  }

  // sendChatMessage persists the visitor's text through Product Gallery into
  // Flow Talk; B-end operators read the same message stream from 对话管理.
  async function sendChatMessage() {
    const text = chatDraft.trim();
    if (!text) {
      return;
    }
    const deviceId = visitorDeviceId ?? (await resolveDeviceId());
    setVisitorDeviceId(deviceId);
    setChatLoading(true);
    setChatDraft("");
    try {
      const result = await clientProductsApi.sendChatMessage(currentProduct.id, deviceId, text);
      setChatBinding(result.chat);
      const conversationID = Number(result.flow_talk_conversation_id);
      if (Number.isFinite(conversationID) && conversationID > 0) {
        await connectClientFlowTalk(deviceId, conversationID);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: String(result.message.id),
            role: "visitor",
            text: result.message.content.text || text,
          },
        ]);
      }
    } catch (error) {
      setChatDraft(text);
      message.error(error instanceof Error ? error.message : "消息发送失败");
    } finally {
      setChatLoading(false);
    }
  }

  function closeChat() {
    setChatOpen(false);
  }

  function renderChatLauncher() {
    if (chatOpen) {
      return null;
    }
    return (
      <Button
        type="primary"
        shape="round"
        size="large"
        icon={<MessageOutlined />}
        className="client-chat-fab"
        onClick={() => void startChat()}
      >
        咨询商品
      </Button>
    );
  }

  function renderChatPopover() {
    if (!chatOpen) {
      return null;
    }
    return (
      <aside className="client-chat-popover" aria-label="商品咨询对话">
        <header className="client-chat-head">
          <div>
            <Typography.Text strong>商品咨询</Typography.Text>
            <Typography.Text type="secondary">
              {chatBinding ? `会话 ${chatBinding.id}` : "正在建立会话"}
            </Typography.Text>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            aria-label="关闭对话"
            onClick={closeChat}
          />
        </header>

        <div className="client-chat-product">
          <span
            className="client-chat-thumb"
            role="img"
            aria-label={currentProduct.title}
            style={{ backgroundImage: `url(${currentProduct.cover_url})` }}
          />
          <div>
            <Typography.Text strong>{currentProduct.title}</Typography.Text>
            <Typography.Text type="secondary">{money(currentProduct.price)}</Typography.Text>
          </div>
        </div>

        <div className="client-chat-stream" ref={chatStreamRef}>
          {chatLoading && chatMessages.length === 0 ? (
            <div className="client-chat-bubble system">正在连接商品顾问...</div>
          ) : (
            chatMessages.map((item) => (
              <div key={item.id} className={`client-chat-bubble ${item.role}`}>
                {item.text}
              </div>
            ))
          )}
        </div>

        <Space.Compact className="client-chat-composer">
          <Input
            value={chatDraft}
            placeholder="输入想咨询的问题"
            onChange={(event) => setChatDraft(event.target.value)}
            onPressEnter={() => void sendChatMessage()}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            className="client-chat-send"
            loading={chatLoading}
            onClick={() => void sendChatMessage()}
          >
            发送
          </Button>
        </Space.Compact>
      </aside>
    );
  }

  return (
    <main className="product-detail-page">
      <div
        className="detail-hero-image"
        role="img"
        aria-label={currentProduct.title}
        style={{ backgroundImage: `url(${currentProduct.cover_url})` }}
      />
      <section className="detail-pane">
        <div className="detail-hero-copy">
          <Link href="/products" className="back-link">
            <ArrowLeftOutlined /> 返回商品列表
          </Link>
          <Typography.Text className="eyebrow">Product Detail</Typography.Text>
          <Typography.Title className="detail-title">{currentProduct.title}</Typography.Title>
          <Typography.Paragraph className="detail-summary">
            {currentProduct.summary}
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" icon={<MessageOutlined />} onClick={startChat}>
              咨询这件商品
            </Button>
            <Tag>{currentProduct.status}</Tag>
          </Space>
        </div>

        <section className="detail-content">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="价格">{money(currentProduct.price)}</Descriptions.Item>
            <Descriptions.Item label="聊天策略">{currentProduct.chat_policy}</Descriptions.Item>
          </Descriptions>
          <Divider />
          <MarkdownPreviewBox source={currentProduct.detail_md} />
        </section>
      </section>
      {renderChatLauncher()}
      {renderChatPopover()}
    </main>
  );
}

function flowTalkConversationID(chat: ChatBinding) {
  const id = Number(chat.flow_talk_conversation_id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

function mapFlowTalkMessages(messages: FlowTalkMessage[], visitorUserID: number): ClientChatMessage[] {
  return [...messages]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((item) => ({
      id: String(item.id),
      role: item.sender_id === visitorUserID ? "visitor" : "admin",
      text: item.content.text || "[非文本消息]",
    }));
}
