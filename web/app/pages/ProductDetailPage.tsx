"use client";

import {
  App,
  Button,
  Descriptions,
  Divider,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, MessageOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useMemo } from "react";
import { clientProductsApi, type Product } from "../api";
import { MarkdownPreviewBox } from "../components/MarkdownEditorField";
import { money } from "./format";
import { sampleProducts } from "./mock";

// ProductDetailPage shows public Markdown content and starts the consultation
// flow for visitors or logged-in C-end users.
export default function ProductDetailPage({
  productId,
  initialProduct,
}: {
  productId: string;
  initialProduct?: Product;
}) {
  const { message } = App.useApp();
  const product = useMemo(
    () => initialProduct ?? sampleProducts.find((item) => item.id === productId) ?? sampleProducts[0],
    [initialProduct, productId],
  );

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

  // startChat creates or reuses the Product Gallery chat binding. Flow Talk
  // realtime UI can later open from the returned binding.
  async function startChat() {
    try {
      const deviceId = await resolveDeviceId();
      const chat = await clientProductsApi.createChat(product.id, deviceId);
      message.success(`已创建或复用会话：${chat.id}`);
    } catch {
      message.warning("当前无法连接聊天接口，已保留咨询入口。");
    }
  }

  return (
    <main className="product-detail-page">
      <section className="detail-hero">
        <div
          className="detail-hero-image"
          role="img"
          aria-label={product.title}
          style={{ backgroundImage: `url(${product.cover_url})` }}
        />
        <div className="detail-hero-copy">
          <Link href="/products" className="back-link">
            <ArrowLeftOutlined /> 返回商品列表
          </Link>
          <Typography.Text className="eyebrow">Product Detail</Typography.Text>
          <Typography.Title className="detail-title">{product.title}</Typography.Title>
          <Typography.Paragraph className="detail-summary">
            {product.summary}
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" icon={<MessageOutlined />} onClick={startChat}>
              咨询这件商品
            </Button>
            <Tag>{product.status}</Tag>
          </Space>
        </div>
      </section>

      <section className="detail-content">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="价格">{money(product.price)}</Descriptions.Item>
          <Descriptions.Item label="聊天策略">{product.chat_policy}</Descriptions.Item>
        </Descriptions>
        <Divider />
        <MarkdownPreviewBox source={product.detail_md} />
      </section>
    </main>
  );
}
