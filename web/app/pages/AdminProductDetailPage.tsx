"use client";

import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Result,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  SaveOutlined,
  StopOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminProductsApi,
  type Product,
  type ProductPayload,
} from "../api";
import { MarkdownEditorField, MarkdownPreviewBox } from "../components/MarkdownEditorField";
import { money } from "./format";

// AdminProductDetailPage is the editable route-level detail page. The list page
// deliberately stays list-only and links here for real editing work.
export default function AdminProductDetailPage({
  initialProduct,
}: {
  productId: string;
  initialProduct?: Product;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductPayload>();
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const watchedDetail = Form.useWatch("detail_md", form);

  // save sends only editable ProductPayload fields and then refreshes both the
  // preview pane and form values from the backend response.
  async function save(values: ProductPayload) {
    if (!product) {
      return;
    }
    setSaving(true);
    try {
      const updated = await adminProductsApi.update(product.id, values);
      setProduct(updated);
      form.setFieldsValue(productToFormValues(updated));
      message.success("商品详情已保存");
    } catch {
      message.error("保存失败，请确认后端服务已启动。");
    } finally {
      setSaving(false);
    }
  }

  // The C-end product list only reads published products. Keeping this control
  // on the detail page makes it clear when an edited draft becomes visible.
  async function changeStatus(status: "published" | "offline") {
    if (!product) {
      return;
    }
    setStatusChanging(true);
    try {
      if (status === "published") {
        await adminProductsApi.publish(product.id);
      } else {
        await adminProductsApi.offline(product.id);
      }
      setProduct((prev) => (prev ? { ...prev, status } : prev));
      message.success(status === "published" ? "商品已上架，C 端可见" : "商品已下架，C 端不可见");
    } catch {
      message.error("状态更新失败，请确认后端服务已启动。");
    } finally {
      setStatusChanging(false);
    }
  }

  useEffect(() => {
    // Ant Design Form reads initialValues only on first mount. When a dynamic
    // route is rendered with server-provided initialProduct, mirror it into the
    // form after hydration so the editor and preview stay aligned.
    if (product) {
      form.setFieldsValue(productToFormValues(product));
    }
  }, [form, product]);

  if (!product) {
    return (
      <main className="workspace">
        <Result
          status="404"
          title="商品不存在"
          subTitle="请返回商品列表选择一个真实商品。"
          extra={
            <Link href="/admin/products">
              <Button type="primary">返回商品列表</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="workspace product-admin-detail">
      <section className="detail-toolbar">
        <Link href="/admin/products" className="back-link">
          <ArrowLeftOutlined /> 返回商品列表
        </Link>
        <Space>
          <Tag>{product.status}</Tag>
          <Typography.Text type="secondary">{money(product.price)}</Typography.Text>
          {product.status === "published" ? (
            <Button
              danger
              icon={<StopOutlined />}
              loading={statusChanging}
              onClick={() => void changeStatus("offline")}
            >
              下架
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={statusChanging}
              onClick={() => void changeStatus("published")}
            >
              上架到 C 端
            </Button>
          )}
        </Space>
      </section>

      <section className="admin-detail-layout">
        <div className="admin-editor">
          <Typography.Text className="eyebrow">Product Editor</Typography.Text>
          <Typography.Title level={2}>编辑商品详情</Typography.Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={save}
            initialValues={productToFormValues(product)}
          >
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="商品标题" />
            </Form.Item>
            <Form.Item name="summary" label="简介" rules={[{ required: true }]}>
              <Input.TextArea rows={2} placeholder="列表和详情页摘要" />
            </Form.Item>
            <Form.Item name="price" label="价格">
              <InputNumber min={0} precision={2} className="full-width" />
            </Form.Item>
            <Form.Item name="cover_url" label="封面 URL">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item name="detail_md" label="Markdown 详情">
              <MarkdownEditorField height="420px" />
            </Form.Item>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<CloudUploadOutlined />}>选择封面或文档</Button>
            </Upload>
            <div className="form-actions">
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                保存详情
              </Button>
            </div>
          </Form>
        </div>

        <aside className="admin-preview">
          <Typography.Text className="eyebrow">Preview</Typography.Text>
          <Typography.Title level={3}>{product.title}</Typography.Title>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="商品 ID">{product.id}</Descriptions.Item>
            <Descriptions.Item label="负责人">
              {product.owner_admin_id ?? "未分配"}
            </Descriptions.Item>
            <Descriptions.Item label="聊天策略">{product.chat_policy}</Descriptions.Item>
          </Descriptions>
          <MarkdownPreviewBox source={watchedDetail ?? product.detail_md} />
        </aside>
      </section>
    </main>
  );
}

// productToFormValues isolates API shape -> Ant Design form shape conversion.
function productToFormValues(product: Product): ProductPayload {
  return {
    title: product.title,
    summary: product.summary,
    price: product.price ?? undefined,
    cover_url: product.cover_url,
    detail_md: product.detail_md,
    owner_admin_id: product.owner_admin_id,
    chat_policy: product.chat_policy,
  };
}
