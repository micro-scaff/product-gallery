# Product Gallery 商品预览

Product Gallery 是一个商品展示与咨询系统，包含管理后台、C 端商品展示和 Flow Talk 聊天接入。

## 文档入口

- [项目说明](OVERVIEW.md)：项目目标、业务范围、角色权限和核心规则。
- [实施说明](IMPLEMENTATION.md)：技术选型、数据库、后端结构、接口、页面和实施顺序。
- [Web 端说明](web/README.md)：Next.js、Ant Design、页面范围和 UI 风格。
- [Server 端说明](server/README.md)：Go、Gin MVC、本地 MySQL、接口和上传文件规则。

## 首期技术要求

- 后端使用 Go + Gin，参考 `demo-gin-mvc-verification-code` 的轻量 MVC 结构。
- 前端使用 Next.js + Ant Design，UI 风格遵循 `$frontend-skill`。
- 数据库使用本地 MySQL：`127.0.0.1:3306/product_gallery`。
- 前端尽量承担交互、校验和权限入口控制，后端保持简洁，仅做必要基础校验。

## 本地启动

本地端口约定：

| 服务 | 默认端口 | 说明 |
| --- | --- | --- |
| Web 前端 | `3000` | Next.js 页面服务。 |
| Product Gallery Server | `18080` | Go 业务接口服务，可用 `APP_PORT` 覆盖。 |
| Flow Talk Server | `8080` | 本地聊天通讯服务，Product Gallery 不占用此端口。 |

后端：

```bash
cd server
go mod tidy
go run .
```

前端：

```bash
cd web
npm install
npm run dev
```

如需显式指定后端地址：

```bash
NEXT_PUBLIC_API_BASE=http://localhost:18080 npm run dev
```
