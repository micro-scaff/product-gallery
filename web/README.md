# Product Gallery Web 端说明

Web 端负责管理后台和 C 端页面实现，业务范围以根目录 [OVERVIEW.md](../OVERVIEW.md) 为准，实施拆分以 [IMPLEMENTATION.md](../IMPLEMENTATION.md) 为准。

## 技术栈

- Next.js `16.2.12`
- React `19.2.4`
- Ant Design
- TypeScript
- Tailwind CSS `4`

## 开发命令

```bash
npm install
npm run dev
npm run build
npm run lint
```

Web 默认请求 `http://localhost:18080` 的 Product Gallery Server。`http://localhost:8080` 由本地 `flow-talk-server` 使用，不作为业务后端地址。

如需覆盖业务接口地址：

```bash
NEXT_PUBLIC_API_BASE=http://localhost:18080 npm run dev
```

## 页面范围

页面实现组件统一放在 `web/app/pages` 下，Next App Router 的实际路由文件只保留薄入口：

- `web/app/products/page.tsx` 引用 `web/app/pages/ProductsPage.tsx`
- `web/app/products/[id]/page.tsx` 引用 `web/app/pages/ProductDetailPage.tsx`
- `web/app/admin/products/page.tsx` 引用 `web/app/pages/AdminProductsPage.tsx`
- `web/app/admin/products/[id]/page.tsx` 引用 `web/app/pages/AdminProductDetailPage.tsx`
- `web/app/admin/admins/page.tsx` 引用 `web/app/pages/AdminAdminsPage.tsx`
- `web/app/admin/users/page.tsx` 引用 `web/app/pages/AdminUsersPage.tsx`
- `web/app/admin/chats/page.tsx` 引用 `web/app/pages/AdminChatsPage.tsx`
- `web/app/admin/settings/page.tsx` 引用 `web/app/pages/AdminSettingsPage.tsx`

### 管理后台

| 页面 | 首期路由 | 首期能力 |
| --- | --- | --- |
| 登录页 | `/admin/login` | 管理员登录。 |
| 商品列表 | `/admin/products` | 只展示商品列表、状态和进入详情的操作。 |
| 商品编辑 | `/admin/products/{id}` | 基础字段、Markdown 编辑/预览、文档转换、聊天配置。 |
| 管理员管理 | `/admin/admins` | 普通管理员创建、禁用、编辑和重置密码。 |
| 用户管理 | `/admin/users` | 用户查询、详情、启用/禁用、重置密码。 |
| 聊天工作台 | `/admin/chats` | 会话列表、消息详情、实时接收和回复，兼容手机浏览器。 |
| 系统设置 | `/admin/settings` | 系统级聊天开关。 |

### C 端

| 页面 | 首期路由 | 首期能力 |
| --- | --- | --- |
| 商品列表 | `/products` | 只展示已上架商品列表，兼容 PC 和手机。 |
| 商品详情 | `/products/{id}` | 展示 Markdown 详情、价格、封面和聊天入口。 |
| 登录页/弹窗 | `/login` | 手机号、密码和图形验证码登录。 |
| 个人中心 | `/profile` | 查看和修改头像、手机号、密码。 |
| 聊天入口 | 浮层 | 创建或复用商品咨询会话，连接 Flow Talk。 |

## 前端实现约定

- Next App Router 的路由文件默认保持 Server Component，用于服务端获取首屏列表/详情数据，并通过 props 传给 `web/app/pages` 下的交互组件。
- 只有确实需要浏览器能力的组件才保留 `"use client"`，例如 Ant Design 表单/弹窗/消息提示、`useState` 交互、`localStorage` 登录态、FingerprintJS、Flow Talk 发送消息等。
- 管理端登录态当前保存在 `localStorage`，服务端渲染阶段无法读取 Bearer token；如果后续需要严格的管理端 SSR 鉴权，应把登录态迁移为 HttpOnly Cookie 或由 Next 中间层代理注入。
- 公共请求方法统一放在 `web/app/request`，负责 API Base、JSON/FormData 请求头、错误拦截和统一异常。
- 管理端登录态保存在浏览器本地，公共请求层会自动为后台接口带上 `Authorization: Bearer <token>`。
- 前端不使用全局头部和全局搜索；公开商品路由仍可通过 `/products` 直接访问。
- 未登录状态不展示后台模块；直接进入管理端会跳转到 `/admin/login`。
- 管理端模块访问由独立路由和 `AdminGate` 按登录角色控制：超级管理员可访问全部后台模块，普通管理员不能访问管理员管理和系统设置。
- 具体业务请求统一放在 `web/app/api`，按模块拆分为商品、管理员、用户、聊天、设置和认证等文件。
- 管理后台接口统一调用 `/api/admin/*`，C 端接口统一调用 `/api/client/*`。
- 列表接口使用 `page`、`page_size` 分页参数，并消费 `items`、`total`、`page`、`page_size` 返回结构。
- 接口成功响应按 `{ "data": ... }` 处理；失败响应按 `{ "error": { "code": "...", "message": "..." } }` 处理。
- 首期尽量由前端承担页面入口、按钮展示、表单校验、筛选排序、上传前校验和交互反馈，以减少后端复杂度。
- 后台权限展示以按钮状态、表格操作列和路由守卫控制为主；后端只做必要基础校验。
- C 端首次访问时使用 FingerprintJS 生成设备 ID，并在游客聊天、登录合并等请求中提交给后端。
- 商品详情渲染 Markdown 时，需要配合后端过滤后的安全内容展示。
- 上传头像、商品封面和文档转换文件时，前端只保存接口返回的静态资源 URL，不拼接服务器绝对路径。

## UI 风格

前端 UI 使用 `$frontend-skill` 作为风格约束，并结合 Ant Design 组件完成实现。

- visual thesis：清爽克制的商品咨询工作台，白色与浅灰为主，使用一个稳定强调色突出操作和状态。
- content plan：管理后台优先呈现工作区、列表、详情和聊天；C 端优先呈现商品、详情、登录和咨询入口。
- interaction thesis：页面进入使用轻量淡入，列表行和操作按钮提供清楚的 hover/active 反馈，移动端聊天切换使用顺滑的列表到详情过渡。

管理后台采用偏 Linear 风格的工作台体验：密集但易读，少卡片、少装饰，重点信息靠排版、间距、表格和状态标签表达。C 端商品展示需要突出商品本身，避免把首屏做成普通后台面板。

## 聊天联调要求

- 临时联调阶段，管理端聊天工作台会先调用 Product Gallery `/api/admin/flow-talk/token`，再用返回的 `provider=demo` 和外部 Token 调用本地 `flow-talk-server:8080`。
- 当前临时链路使用 Flow Talk HTTP 接口跑通外部登录、创建单聊、发送文本消息和读取历史消息；WebSocket 实时收发留到正式 Flow Talk provider 接入后完善。
- 管理员能够分别在 PC 和手机浏览器中打开聊天工作台并正常切换会话。
- C 端发送新消息后，管理员界面无需手动刷新即可收到消息和未读提示。
- 管理员从手机端回复后，C 端能够实时收到消息，且双方刷新页面后仍能查看历史记录。
- 超级管理员和普通管理员只能查看、回复各自权限范围内的会话。
