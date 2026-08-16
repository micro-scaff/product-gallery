"use client";

import {
  App,
  Badge,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import { MarkdownEditorField } from "../components/MarkdownEditorField";
import { adminProductsApi, type Product, type ProductPayload } from "../api";
import { money } from "./format";
import { WorkspaceHeader } from "./WorkspaceHeader";

// AdminProductsPage is intentionally list-first. Detail editing lives on
// /admin/products/[id] so every module has a clear route boundary.
export default function AdminProductsPage({
  initialProducts = [],
}: {
  initialProducts?: Product[];
}) {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [open, setOpen] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string>();
  const [form] = Form.useForm<ProductPayload>();

  async function refresh() {
    try {
      const page = await adminProductsApi.list();
      setProducts(page.items);
    } catch {
      message.info("后端未启动，暂无商品数据。");
    }
  }

  async function createProduct(values: ProductPayload) {
    try {
      const product = await adminProductsApi.create({
        ...values,
        // New products start by inheriting the global chat switch unless an
        // explicit product policy is later chosen in detail editing.
        chat_policy: "inherit",
      });
      setProducts((prev) => [product, ...prev]);
      message.success("商品草稿已创建");
      setOpen(false);
      form.resetFields();
    } catch {
      message.error("创建失败，请确认后端服务已启动。");
    }
  }

  // changeProductStatus is the bridge between management and the C-end list:
  // only products marked as "published" are returned by /api/client/products.
  async function changeProductStatus(product: Product, status: "published" | "offline") {
    setStatusChangingId(product.id);
    try {
      if (status === "published") {
        await adminProductsApi.publish(product.id);
      } else {
        await adminProductsApi.offline(product.id);
      }
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, status } : item)),
      );
      message.success(status === "published" ? "商品已上架，C 端可见" : "商品已下架，C 端不可见");
    } catch {
      message.error("状态更新失败，请确认后端服务已启动。");
    } finally {
      setStatusChangingId(undefined);
    }
  }

  // Keep table columns near the page so product list behavior is easy to scan.
  const productColumns: ColumnsType<Product> = [
    { title: "商品", dataIndex: "title" },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "价格",
      dataIndex: "price",
      width: 140,
      render: (value) => money(value),
    },
    {
      title: "聊天",
      dataIndex: "chat_policy",
      width: 120,
      render: (value) => <Badge status="processing" text={value} />,
    },
    {
      title: "操作",
      width: 220,
      render: (_, record) => (
        <Space>
          {record.status === "published" ? (
            <Button
              danger
              size="small"
              icon={<StopOutlined />}
              loading={statusChangingId === record.id}
              onClick={() => void changeProductStatus(record, "offline")}
            >
              下架
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={statusChangingId === record.id}
              onClick={() => void changeProductStatus(record, "published")}
            >
              上架
            </Button>
          )}
          <Link href={`/admin/products/${record.id}`} className="row-link">
            详情 <ArrowRightOutlined />
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <main className="workspace">
      <WorkspaceHeader
        title="商品管理"
        description="商品创建、编辑、上下架和聊天策略在这里处理。"
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              新建商品
            </Button>
          </Space>
        }
      />
      <section className="table-panel">
        <Typography.Title level={5}>商品列表</Typography.Title>
        <Table
          rowKey="id"
          size="middle"
          columns={productColumns}
          dataSource={products}
          pagination={false}
          locale={{ emptyText: <Empty description="暂无商品" /> }}
        />
      </section>
      <Modal
        title="创建商品草稿"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={createProduct}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="商品标题" />
          </Form.Item>
          <Form.Item name="summary" label="简介" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="列表和详情页摘要" />
          </Form.Item>
          <Form.Item name="price" label="价格">
            <InputNumber min={0} precision={2} className="full-width" />
          </Form.Item>
          <Form.Item name="detail_md" label="Markdown 详情">
            <MarkdownEditorField height="360px" />
          </Form.Item>
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button icon={<CloudUploadOutlined />}>选择封面或文档</Button>
          </Upload>
        </Form>
      </Modal>
    </main>
  );
}
