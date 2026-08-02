# Product Gallery Server 端说明

Server 端负责业务接口、权限校验、数据持久化、上传文件管理、文档转换和 Flow Talk 身份换票。业务范围以根目录 [OVERVIEW.md](../OVERVIEW.md) 为准，实施拆分以 [IMPLEMENTATION.md](../IMPLEMENTATION.md) 为准。

## 技术栈

- Go `1.25.4`
- Gin
- MySQL
- HTTP API 前缀统一使用 `/api`
- 管理后台接口放在 `/api/admin`
- C 端接口放在 `/api/client`

后端代码参考 `https://github.com/Not-have/demo-go/tree/main/demo-gin-mvc-verification-code` 的轻量 Gin MVC 结构：`main.go` 初始化 Gin，`routers` 注册路由，`controllers` 处理 HTTP 请求，`models` 放数据模型，`middlewares` 放中间件。当前项目在此基础上增加 `services` 和 `utils`，让业务逻辑更清楚。

## 本地数据库

```ini
host = 127.0.0.1
port = 3306
username = root
password = admin
database = product_gallery
```

## 后端实现约定

- 首期以前端控制页面入口、按钮展示、表单校验和业务流程为主，后端不需要对所有接口做完整权限验证。
- 后端需要保留基础校验：登录接口校验账号状态和密码，关键写操作校验必要参数，涉及商品归属、用户禁用、会话接待方等核心数据时做最低限度的数据约束。
- 业务对象使用服务端生成的稳定 ID 建立关系，不能用手机号、标题、昵称等可变字段作为关联主键。
- 时间字段统一保存服务端时间，并在接口中返回 ISO 8601 字符串。
- 列表接口默认支持分页，分页参数采用 `page`、`page_size`，返回 `items`、`total`、`page`、`page_size`。
- 接口成功响应统一为 `{ "data": ... }`，失败响应统一为 `{ "error": { "code": "...", "message": "..." } }`。
- 删除商品、管理员和用户优先采用状态变更或软删除；存在业务历史的数据不得物理删除。
- 超级管理员、普通管理员和 C 端用户密码均按业务要求以明文保存和校验。
- 代码需要添加清晰、详细且有助于阅读的注释，尤其是路由注册、请求解析、数据库访问、上传文件保存、验证码和 Flow Talk 换票逻辑。

## 建议目录结构

```text
server/
  main.go
  conf/
  routers/
  controllers/
  models/
  services/
  middlewares/
  utils/
  static/
```

目录职责：

- `main.go` 创建 Gin 实例，加载配置，注册路由，启动服务。
- `conf` 保存本地配置，包含数据库、端口、Flow Talk 等。
- `routers` 只注册路由，不写业务逻辑。
- `controllers` 接收参数、调用 service、返回统一 JSON。
- `models` 定义数据结构和数据库字段映射。
- `services` 承载商品、用户、游客设备、上传、聊天绑定和 Flow Talk 换票等业务逻辑。
- `middlewares` 放 CORS、请求日志、基础登录态等中间件。
- `utils` 放验证码、文件名处理、响应封装等通用工具。
- `static` 存放上传文件。

## 上传文件存储

所有上传文件统一写入项目目录 `server/static`。

路径格式：

```text
server/static/{file_type}/{file_name}-{user_id}
```

约定：

- `file_type` 按业务类型划分，首期至少包含 `avatar`、`cover`、`document`。
- `file_name` 使用上传文件名去除路径后的安全文件名，服务端需要过滤路径分隔符和不可见字符。
- `user_id` 使用发起上传的业务用户 ID 或管理员 ID；游客上传场景使用游客设备 ID。
- 数据库中保存可被前端访问的静态资源 URL，不保存服务器绝对路径。
- 上传同名文件时，如果生成路径已存在，服务端需要返回明确错误或生成不冲突的新文件名，不能静默覆盖旧文件。
- 文档转换成功后将 Markdown 回填给前端；转换失败不得覆盖已有内容。

## 数据对象

首期至少需要覆盖以下数据对象，具体字段见 [IMPLEMENTATION.md](../IMPLEMENTATION.md)：

| 对象 | 用途 |
| --- | --- |
| `admins` | 超级管理员、普通管理员、后台登录和权限状态。 |
| `users` | C 端用户、手机号、头像、明文密码和账号状态。 |
| `visitor_devices` | 游客设备 ID、用户绑定和访问时间。 |
| `products` | 商品基础信息、Markdown 详情、负责人、状态和聊天策略。 |
| `chat_bindings` | Product Gallery 会话与 Flow Talk 会话的业务绑定。 |
| `system_settings` | 系统级配置，首期包含全局聊天开关。 |
| `audit_logs` | 管理员、用户、商品、聊天配置和文档转换等关键操作记录。 |

## 管理后台接口

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

普通管理员的页面入口、按钮和主要交互由前端按角色权限控制。后端对列表类接口不要求逐接口完整鉴权，但对商品负责人变更、管理员禁用、用户禁用、会话转交等关键写操作需要做基础约束，避免明显错误数据写入。

## C 端接口

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

## Flow Talk 接入

- Product Gallery 是业务身份源，Flow Talk 只负责 IM 身份和消息能力。
- Product Gallery 服务端签发短期外部身份 Token。
- 客户端调用 Flow Talk `POST /api/auth/external`，提交 `provider = product_gallery` 和外部 Token。
- 后续聊天 HTTP API 和 WebSocket 只使用 Flow Talk JWT。
- Product Gallery 密码不得提交给 Flow Talk。
- 用户、管理员被禁用后，必须阻止继续换票；已签发的 Flow Talk JWT 不续期，过期后自然失效。
