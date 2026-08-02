# Product Gallery 项目实施说明

> 文档状态：首期实施基线
>
> 关联文档：[OVERVIEW.md](OVERVIEW.md)
>
> 本文承接项目说明中的业务范围，用于拆分首期开发任务、接口、数据表、页面和联调顺序。

## 1. 技术选型

### 1.1 后端

- 后端使用 Go + Gin 实现。
- 后端代码参考 `https://github.com/Not-have/demo-go/tree/main/demo-gin-mvc-verification-code` 的轻量 MVC 组织方式。
- 参考示例结构包含 `main.go`、`routers`、`controllers`、`models`、`middlewares`、`conf`、`templates`；本项目保留 MVC 分层思路，但页面由 Next.js 承载，不需要后端模板页面作为首期重点。
- 后端代码需要添加清晰、详细且有助于阅读的注释，尤其是路由注册、请求解析、数据库访问、上传文件保存、验证码和 Flow Talk 换票逻辑。
- 后端逻辑以“清楚、直接、易读”为优先，不做过度封装。

### 1.2 前端

- 前端使用 Next.js + Ant Design 实现。
- UI 风格使用 `$frontend-skill`：管理后台采用克制的工作台风格，信息密度清晰，少装饰、少卡片；C 端商品展示需要有明确的商品视觉主轴。
- 前端尽量承担页面状态、表单校验、权限入口显示、筛选排序、上传前校验和交互反馈，减少后端复杂度。

前端视觉基线：

- visual thesis：清爽克制的商品咨询工作台，白色与浅灰为主，使用一个稳定强调色突出操作和状态。
- content plan：管理后台优先呈现工作区、列表、详情和聊天；C 端优先呈现商品、详情、登录和咨询入口。
- interaction thesis：页面进入使用轻量淡入，列表行和操作按钮提供清楚的 hover/active 反馈，移动端聊天切换使用顺滑的列表到详情过渡。

### 1.3 数据库

本地 MySQL 连接信息如下：

```ini
host = 127.0.0.1
port = 3306
username = root
password = admin
database = product_gallery
```

后端默认读取以上本地连接信息，后续如需要部署环境再改为配置文件或环境变量。

## 2. 实施约定

- 本文使用“必须”“不得”“需要”描述首期必须实现的能力；使用“支持”描述用户可见能力。
- 首期以前端控制页面入口、按钮展示、表单校验和业务流程为主，后端不需要对所有接口做完整权限验证。
- 后端需要保留基础校验：登录接口校验账号状态和密码，关键写操作校验必要参数，涉及商品归属、用户禁用、会话接待方等核心数据时做最低限度的数据约束。
- 所有业务对象使用服务端生成的稳定 ID 建立关系，前端不得以手机号、标题、昵称等可变字段作为关联主键。
- 时间字段统一保存服务端时间，并在接口中返回 ISO 8601 字符串。
- 列表接口默认支持分页，分页参数采用 `page`、`page_size`，返回 `items`、`total`、`page`、`page_size`。
- 删除商品、管理员和用户优先采用状态变更或软删除；存在业务历史的数据不得物理删除。
- 前后端接口前缀统一为 `/api`，管理后台接口放在 `/api/admin` 下，C 端接口放在 `/api/client` 下。

### 2.1 上传文件存储

- 所有上传文件统一写入项目目录 `server/static`。
- 存储路径格式为 `server/static/{file_type}/{file_name}-{user_id}`。
- `file_type` 按业务类型划分，首期至少包含 `avatar`、`cover`、`document`。
- `file_name` 使用上传文件名去除路径后的安全文件名；服务端需要过滤路径分隔符和不可见字符。
- `user_id` 使用发起上传的业务用户 ID 或管理员 ID；游客上传场景使用游客设备 ID。
- 接口保存到数据库中的地址使用可被前端访问的静态资源 URL，不直接暴露服务器绝对路径。
- 上传同名文件时，如果生成路径已存在，服务端需要返回明确错误或生成不冲突的新文件名，不能静默覆盖旧文件。

## 3. 后端目录结构

后端采用易读的 Gin MVC 结构，参考示例如下：

```text
server/
  main.go                  # 创建 Gin 实例，加载配置，注册路由，启动服务
  conf/                    # 本地配置，包含数据库、端口、Flow Talk 等
  routers/                 # 路由注册，按 admin/client/common 拆分
  controllers/             # HTTP 控制器，只处理请求解析、响应和流程编排
  models/                  # 数据模型和数据库字段映射
  services/                # 业务逻辑，保持函数短小、注释清晰
  middlewares/             # CORS、请求日志、基础登录态等中间件
  utils/                   # 验证码、文件名处理、响应封装等通用工具
  static/                  # 上传文件存储目录
```

目录职责：

- `routers` 只注册路由，不写业务逻辑。
- `controllers` 负责接收参数、调用 service、返回统一 JSON。
- `models` 负责定义数据结构，密码字段按业务要求保存明文。
- `services` 负责商品、用户、游客设备、上传、聊天绑定和 Flow Talk 换票等业务逻辑。
- `utils` 放通用函数，避免控制器里堆重复代码。

## 4. 数据落地规格

以下字段为首期必须覆盖的最小集合，以本地 MySQL 为目标数据库。字段命名采用 `snake_case`，枚举值统一使用小写英文字符串。

### 4.1 admins

| 字段 | 说明 |
| --- | --- |
| id | 管理员 ID，主键。 |
| role | `super_admin` 或 `admin`。 |
| username | 登录账号，唯一。 |
| password | 明文密码。 |
| status | `active` 或 `disabled`。 |
| created_at / updated_at | 创建和更新时间。 |

约束：

- `username` 唯一。
- 首期数据库中可以存在超级管理员记录，但后台不得提供创建超级管理员入口。
- 普通管理员被禁用后，其有效后台会话需要失效。

### 4.2 users

| 字段 | 说明 |
| --- | --- |
| id | C 端用户 ID，主键。 |
| phone | 手机号，唯一。 |
| password | 明文密码。 |
| avatar_url | 头像地址，可为空。 |
| status | `active` 或 `disabled`。 |
| created_at / updated_at / last_login_at | 创建、更新和最后登录时间。 |

约束：

- `phone` 唯一。
- 用户被禁用后，登录、换取 Flow Talk Token 和发送新消息均被拒绝。

### 4.3 visitor_devices

| 字段 | 说明 |
| --- | --- |
| id | 游客设备记录 ID，主键。 |
| device_fingerprint | FingerprintJS 生成的设备 ID，唯一。 |
| user_id | 关联的 C 端用户 ID，可为空。 |
| first_seen_at / last_seen_at | 首次访问和最后访问时间。 |

约束：

- `device_fingerprint` 唯一。
- 同一用户可以关联多个设备 ID。

### 4.4 products

| 字段 | 说明 |
| --- | --- |
| id | 商品 ID，主键。 |
| title | 商品标题。 |
| summary | 商品简介。 |
| price | 定点小数，可为空。 |
| cover_url | 封面图地址，可为空。 |
| detail_md | Markdown 原文。 |
| owner_admin_id | 商品负责人，可为空。 |
| status | `draft`、`published`、`offline` 或 `deleted`。 |
| chat_policy | `inherit`、`enabled` 或 `disabled`。 |
| created_by | 创建管理员 ID。 |
| created_at / updated_at / deleted_at | 创建、更新和软删除时间。 |

约束：

- 只有 `published` 状态商品对 C 端可见。
- 普通管理员只能修改 `owner_admin_id` 等于自己的商品。
- `deleted` 商品不在后台默认列表展示，但历史会话仍可关联查询。

### 4.5 chat_bindings

| 字段 | 说明 |
| --- | --- |
| id | 会话绑定 ID，主键。 |
| product_id | 商品 ID。 |
| product_title_snapshot | 发起咨询时的商品标题快照。 |
| visitor_device_id | 游客设备 ID，可为空。 |
| user_id | C 端用户 ID，可为空。 |
| receiver_admin_id | 当前接待管理员 ID。 |
| flow_talk_conversation_id | Flow Talk 会话 ID，唯一。 |
| status | `open`、`readonly` 或 `closed`。 |
| created_at / updated_at / last_message_at | 创建、更新和最后消息时间。 |

约束：

- `visitor_device_id` 和 `user_id` 至少有一个非空。
- 同一用户身份针对同一商品复用已有会话绑定。
- 接待管理员删除或不可用时，`receiver_admin_id` 自动改为超级管理员 ID。

### 4.6 system_settings

| 字段 | 说明 |
| --- | --- |
| key | 配置键，主键。 |
| value | 配置值。 |
| updated_by | 最后修改管理员 ID。 |
| updated_at | 更新时间。 |

首期必须包含：

- `chat.global_policy`：`enabled` 或 `disabled`。

### 4.7 audit_logs

| 字段 | 说明 |
| --- | --- |
| id | 审计记录 ID，主键。 |
| actor_type | `admin`、`user` 或 `system`。 |
| actor_id | 操作人 ID，可为空。 |
| action | 操作名称。 |
| target_type | 目标对象类型。 |
| target_id | 目标对象 ID。 |
| result | `success` 或 `failed`。 |
| request_id | 请求 ID。 |
| created_at | 创建时间。 |

首期需要记录管理员创建/禁用、用户禁用/重置密码、商品上下架/删除/负责人变更、聊天开关变更、会话转交和文档转换失败。

## 5. 接口清单

接口返回结构统一为 `{ "data": ... }`；失败时返回 `{ "error": { "code": "...", "message": "..." } }`。业务校验失败使用明确错误码，前端按错误码展示文案。

### 5.1 管理后台接口

| 方法 | 路径 | 能力 | 权限 |
| --- | --- | --- | --- |
| POST | `/api/admin/auth/login` | 管理员登录 | 未登录 |
| POST | `/api/admin/auth/logout` | 管理员退出 | 管理员 |
| GET | `/api/admin/auth/me` | 获取当前管理员信息和权限 | 管理员 |
| GET | `/api/admin/admins` | 管理员列表 | 超级管理员 |
| POST | `/api/admin/admins` | 创建普通管理员 | 超级管理员 |
| PATCH | `/api/admin/admins/{id}` | 编辑普通管理员账号和状态 | 超级管理员 |
| POST | `/api/admin/admins/{id}/reset-password` | 重置普通管理员密码 | 超级管理员 |
| GET | `/api/admin/users` | C 端用户列表 | 管理员 |
| GET | `/api/admin/users/{id}` | C 端用户详情 | 管理员 |
| PATCH | `/api/admin/users/{id}` | 启用或禁用 C 端用户 | 管理员 |
| POST | `/api/admin/users/{id}/reset-password` | 重置 C 端用户密码 | 管理员 |
| GET | `/api/admin/products` | 商品列表 | 管理员 |
| POST | `/api/admin/products` | 创建商品草稿 | 管理员 |
| GET | `/api/admin/products/{id}` | 商品详情 | 管理员 |
| PATCH | `/api/admin/products/{id}` | 编辑商品基础信息和 Markdown | 管理员 |
| POST | `/api/admin/products/{id}/publish` | 上架商品 | 管理员 |
| POST | `/api/admin/products/{id}/offline` | 下架商品 | 管理员 |
| DELETE | `/api/admin/products/{id}` | 软删除商品 | 管理员 |
| POST | `/api/admin/products/{id}/assign-owner` | 变更商品负责人 | 超级管理员 |
| POST | `/api/admin/products/{id}/convert-document` | 上传 PDF/Word 并转换为 Markdown | 管理员 |
| GET | `/api/admin/settings/chat` | 查看系统聊天开关 | 超级管理员 |
| PATCH | `/api/admin/settings/chat` | 修改系统聊天开关 | 超级管理员 |
| GET | `/api/admin/chats` | 会话列表 | 管理员 |
| GET | `/api/admin/chats/{id}` | 会话详情和业务上下文 | 管理员 |
| POST | `/api/admin/chats/{id}/transfer` | 转交会话 | 超级管理员 |
| POST | `/api/admin/chats/{id}/read` | 标记会话已读 | 管理员 |
| POST | `/api/admin/flow-talk/token` | 为当前管理员换取 Flow Talk 外部身份 Token | 管理员 |

普通管理员的页面入口、按钮和主要交互由前端按 `OVERVIEW.md` 中的角色权限控制。后端对列表类接口不要求逐接口完整鉴权，但对商品负责人变更、管理员禁用、用户禁用、会话转交等关键写操作需要做基础约束，避免明显错误数据写入。

### 5.2 C 端接口

| 方法 | 路径 | 能力 | 权限 |
| --- | --- | --- | --- |
| POST | `/api/client/visitor-device` | 创建或刷新游客设备记录 | 游客 |
| POST | `/api/client/auth/login` | 手机号、密码和图形验证码登录 | 游客 |
| POST | `/api/client/auth/logout` | C 端退出 | 用户 |
| GET | `/api/client/auth/me` | 获取当前 C 端用户 | 用户 |
| GET | `/api/client/captcha` | 获取图形验证码凭证 | 游客 |
| GET | `/api/client/products` | 已上架商品列表 | 游客/用户 |
| GET | `/api/client/products/{id}` | 已上架商品详情 | 游客/用户 |
| GET | `/api/client/profile` | 个人中心资料 | 用户 |
| PATCH | `/api/client/profile` | 修改头像或手机号 | 用户 |
| POST | `/api/client/profile/change-password` | 修改密码 | 用户 |
| POST | `/api/client/products/{id}/chat` | 创建或复用商品咨询会话 | 游客/用户 |
| GET | `/api/client/chats/{id}` | 获取会话业务上下文 | 游客/用户 |
| POST | `/api/client/flow-talk/token` | 为当前游客或用户换取 Flow Talk 外部身份 Token | 游客/用户 |

游客调用聊天相关接口时必须提交设备 ID；用户登录后同时提交登录凭证和设备 ID，用于完成游客身份合并。

## 6. 前端页面清单

### 6.1 管理后台

| 页面 | 首期路由 | 首期能力 |
| --- | --- | --- |
| 登录页 | `/admin/login` | 管理员登录。 |
| 商品列表 | `/admin/products` | 查询、筛选、创建、上下架和进入编辑。 |
| 商品编辑 | `/admin/products/{id}` | 基础字段、Markdown 编辑/预览、文档转换、聊天配置。 |
| 管理员管理 | `/admin/admins` | 普通管理员创建、禁用、编辑和重置密码。 |
| 用户管理 | `/admin/users` | 用户查询、详情、启用/禁用、重置密码。 |
| 聊天工作台 | `/admin/chats` | 会话列表、消息详情、实时接收和回复，兼容手机浏览器。 |
| 系统设置 | `/admin/settings` | 系统级聊天开关。 |

### 6.2 C 端

| 页面 | 首期路由 | 首期能力 |
| --- | --- | --- |
| 商品列表 | `/products` | 展示已上架商品，兼容 PC 和手机。 |
| 商品详情 | `/products/{id}` | 展示 Markdown 详情、价格、封面和聊天入口。 |
| 登录页/弹窗 | `/login` | 手机号、密码和图形验证码登录。 |
| 个人中心 | `/profile` | 查看和修改头像、手机号、密码。 |
| 聊天入口 | 商品详情内嵌或浮层 | 创建或复用商品咨询会话，连接 Flow Talk。 |

### 6.3 聊天联调要求

- 管理员能够分别在 PC 和手机浏览器中打开聊天工作台并正常切换会话。
- C 端发送新消息后，管理员界面无需手动刷新即可收到消息和未读提示。
- 管理员从手机端回复后，C 端能够实时收到消息，且双方刷新页面后仍能查看历史记录。
- 超级管理员和普通管理员只能查看、回复各自权限范围内的会话。

## 7. 实施顺序

1. 后端按 Gin MVC 建立 `main.go`、`routers`、`controllers`、`models`、`services`、`middlewares`、`utils` 目录，并连接本地 MySQL。
2. 前端引入 Ant Design，建立管理后台和 C 端基础布局，按 `$frontend-skill` 确定克制、清晰的产品 UI 基线。
3. 落地 `admins`、`users`、`visitor_devices`、`products`、`system_settings`、`audit_logs` 基础表。
4. 完成管理后台登录、普通管理员管理、C 端用户管理；后端做必要基础校验，前端承担主要权限入口控制。
5. 完成商品管理、Markdown 编辑、上架/下架、软删除和 C 端商品展示。
6. 完成文档转 Markdown、头像/封面上传和上传限制，文件写入 `server/static/{file_type}/{file_name}-{user_id}`。
7. 落地 `chat_bindings`、聊天开关、会话路由、游客设备合并和 Flow Talk 换票。
8. 完成管理员聊天工作台和 C 端聊天入口的实时消息联调。
