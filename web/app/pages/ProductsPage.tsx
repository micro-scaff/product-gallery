"use client";

import {
  App,
  Button,
  Empty,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowRightOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { clientProductsApi, type Product } from "../api";
import { money } from "./format";

// ProductsPage is the default C-end route. It intentionally shows only a list;
// product details live at /products/[id].
export default function ProductsPage({
  initialProducts = [],
}: {
  initialProducts?: Product[];
}) {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const page = await clientProductsApi.list();
      setProducts(page.items);
    } catch (error) {
      message.info(error instanceof Error ? error.message : "后端未启动，暂无商品数据。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="client-surface product-index">
      <section className="catalog-hero">
        <div className="hero-copy">
          <Typography.Text className="eyebrow">Product Gallery</Typography.Text>
          <Typography.Title className="hero-title">
            商品目录，只保留最清楚的入口。
          </Typography.Title>
          <Typography.Paragraph className="hero-text">
            列表用于快速浏览；点击商品进入独立详情页查看 Markdown 内容并发起咨询。
          </Typography.Paragraph>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadProducts}>
              刷新商品
            </Button>
          </Space>
        </div>
        <div
          className="hero-image"
          role="img"
          aria-label="商品目录封面"
          style={{ backgroundImage: products[0]?.cover_url ? `url(${products[0].cover_url})` : undefined }}
        />
      </section>

      <section className="product-list-only">
        <Typography.Title level={4}>已上架商品</Typography.Title>
        {products.length === 0 ? (
          <Empty description="暂无已上架商品" />
        ) : (
          <ul className="plain-list">
            {products.map((item) => (
              <li key={item.id} className="product-row entity-row">
                <div className="entity-meta">
                  <span
                    className="thumb"
                    role="img"
                    aria-label={item.title}
                    style={{ backgroundImage: `url(${item.cover_url})` }}
                  />
                  <div className="entity-copy">
                    <Link href={`/products/${item.id}`}>{item.title}</Link>
                    <Typography.Text type="secondary">
                      {item.summary} · {money(item.price)}
                    </Typography.Text>
                  </div>
                </div>
                <div className="entity-actions">
                  <Tag>{item.status}</Tag>
                  <Link href={`/products/${item.id}`} className="row-link">
                    查看详情 <ArrowRightOutlined />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
