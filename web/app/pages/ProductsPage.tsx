"use client";

import {
  App,
  Button,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowRightOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useState } from "react";
import { clientProductsApi, type Product } from "../api";
import { money } from "./format";
import { sampleProducts } from "./mock";

// ProductsPage is the default C-end route. It intentionally shows only a list;
// product details live at /products/[id].
export default function ProductsPage({
  initialProducts = sampleProducts,
}: {
  initialProducts?: Product[];
}) {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>(
    initialProducts.length > 0 ? initialProducts : sampleProducts,
  );
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const page = await clientProductsApi.list();
      if (page.items.length > 0) {
        // Preserve sample data when the fresh database has no published products.
        setProducts(page.items);
      }
    } catch (error) {
      message.info(error instanceof Error ? error.message : "后端未启动，当前展示本地示例商品。");
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
          style={{ backgroundImage: `url(${products[0]?.cover_url})` }}
        />
      </section>

      <section className="product-list-only">
        <Typography.Title level={4}>已上架商品</Typography.Title>
        <List
          dataSource={products}
          renderItem={(item) => (
            <List.Item
              className="product-row"
              actions={[
                <Link key="detail" href={`/products/${item.id}`} className="row-link">
                  查看详情 <ArrowRightOutlined />
                </Link>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <span
                    className="thumb"
                    role="img"
                    aria-label={item.title}
                    style={{ backgroundImage: `url(${item.cover_url})` }}
                  />
                }
                title={<Link href={`/products/${item.id}`}>{item.title}</Link>}
                description={`${item.summary} · ${money(item.price)}`}
              />
              <Tag>{item.status}</Tag>
            </List.Item>
          )}
        />
      </section>
    </main>
  );
}
