# longchat
reverse longcat into openai
# LongCat API Proxy for Deno

一个基于 Deno 的代理服务器，将 OpenAI API 格式的请求转换为 LongCat API 的请求格式。

## 功能特性

- ✅ 支持 OpenAI 兼容的聊天补全接口
- ✅ 支持流式和非流式响应
- ✅ 多账户 Cookie 轮询机制
- ✅ 自动会话管理（创建后自动删除）
- ✅ 随机 User-Agent 轮换
- ✅ 随机延迟保护机制

### 🆕 新增功能

#### Docker 容器化部署
- **一键部署**: 使用 Docker Compose 快速启动服务
- **Node.js 运行时**: 基于 Bun 运行时，性能优异
- **自动重启**: 容器异常退出时自动重启

#### 智能轮询负载均衡
- **轮询机制**: 每个 Cookie 使用 3 次后自动切换到下一个
- **循环使用**: 按顺序循环使用所有可用的 Cookie
- **自动跳过**: 自动跳过失效的 Cookie

#### 智能失败处理
- **轮询失败检测**: 记录每次轮询失败的次数
- **永久禁用**: 连续 5 次轮询失败后永久禁用 Cookie
- **优雅降级**: 单个 Cookie 失败时不影响用户体验

#### 实时监控接口
- **状态接口**: `/stats` 接口查看所有 Cookie 状态
- **详细日志**: 完整的成功/失败日志记录
- **统计信息**: 成功率、失败次数、轮询失败计数等

## 快速开始

### 环境要求

**原版运行**:
- [Deno](https://deno.com/) 1.30.0 或更高版本

**Docker 运行**:
- Docker 和 Docker Compose

### 安装和运行

#### 方式一：原版运行

1. 克隆或下载项目文件
2. 配置环境变量（可选）
3. 运行服务：

```bash
# 直接运行
deno run --allow-net --allow-env main.ts

# 或指定端口运行
deno run --allow-net --allow-env main.ts --port=8000
```

#### 方式二：Docker 部署（推荐）

1. 克隆项目
2. 配置环境变量：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件，设置 Cookie
nano .env
```

3. 启动服务：

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker logs -f longchat-proxy
```

4. 测试服务：

```bash
# 测试模型列表
curl http://localhost:8000/v1/models

# 测试聊天接口
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "LongCat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 环境变量配置

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `API_BASEURL` | LongCat API 基础地址 | `https://longcat.chat` |
| `AUTH_COOKIES` | 认证 Cookie，多个使用英文逗号分隔 |复制cookie中的passport_token_key值 |

设置环境变量：

```bash
export AUTH_COOKIES="your_cookie_1,your_cookie_2"
export API_BASEURL="https://your-longcat-instance.com"
deno run --allow-net --allow-env main.ts
```

## API 使用

### 获取可用模型

```bash
curl http://localhost:8000/v1/models
```

### 🆕 监控接口

#### 获取 Cookie 状态

```bash
curl http://localhost:8000/stats
```

响应示例：
```json
{
  "totalCookies": 3,
  "currentCookie": 1,
  "currentRequests": 2,
  "cookies": [
    {
      "index": 1,
      "successCount": 15,
      "failureCount": 2,
      "requestCount": 17,
      "rotationFailures": 0,
      "permanentlyDisabled": false,
      "successRate": "88.2%",
      "isActive": true
    },
    {
      "index": 2,
      "successCount": 12,
      "failureCount": 1,
      "requestCount": 13,
      "rotationFailures": 3,
      "permanentlyDisabled": false,
      "successRate": "92.3%",
      "isActive": false
    },
    {
      "index": 3,
      "successCount": 0,
      "failureCount": 5,
      "requestCount": 5,
      "rotationFailures": 5,
      "permanentlyDisabled": true,
      "successRate": "0.0%",
      "isActive": false
    }
  ]
}
```

字段说明：
- `index`: Cookie 索引
- `successCount`: 成功次数
- `failureCount`: 失败次数
- `requestCount`: 总请求次数
- `rotationFailures`: 轮询失败次数
- `permanentlyDisabled`: 是否永久禁用
- `successRate`: 成功率
- `isActive`: 是否当前活跃

响应示例：
```json
{
  "object": "list",
  "data": [
    {
      "id": "LongCat",
      "object": "model",
      "created": 1672531200,
      "owned_by": "longcat"
    },
    {
      "id": "LongCat-Search",
      "object": "model",
      "created": 1753777714,
      "owned_by": "longcat"
    }
  ]
}
```

### 聊天补全接口

#### 非流式请求

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cookie" \
  -d '{
    "model": "LongCat",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下自己"}
    ],
    "stream": false
  }'
```

#### 流式请求

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cookie" \
  -d '{
    "model": "LongCat",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下自己"}
    ],
    "stream": true
  }'
```

### 认证方式

在请求头中提供 Cookie 信息：

```http
Authorization: Bearer your_cookie_value
```

或多个 Cookie（使用逗号分隔）：

```http
Authorization: Bearer cookie1,cookie2,cookie3
```

## 部署

### 部署到 Deno Deploy

1. 将代码推送到 GitHub 仓库
2. 连接到 [Deno Deploy](https://deno.com/deploy)
3. 配置环境变量
4. 部署项目

### 其他部署方式

也可以使用 Docker 或其他支持 Deno 的平台部署：

```dockerfile
FROM denoland/deno:latest

WORKDIR /app
COPY main.ts .
RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "main.ts"]
```
## 免责声明
- 本项目与LongCat官方无关
- 使用者需要自行获取Cookie并承担使用责任
- 项目仅用于学习和技术交流目的，禁止用于商业用途和滥用。
- 滥用可能导致账户无法正常使用。

## 🆕 负载均衡策略

### 轮询机制

1. **顺序使用**: Cookie1 → Cookie2 → Cookie3 → Cookie1 → ...
2. **使用次数**: 每个 Cookie 连续使用 3 次
3. **自动切换**: 使用完 3 次后自动切换到下一个

### 失败处理

1. **单次失败**: 当前 Cookie 失败，立即尝试其他可用 Cookie
2. **轮询失败**: 每次轮询到某个 Cookie 时失败，增加轮询失败计数
3. **成功重置**: Cookie 成功时重置轮询失败计数
4. **永久禁用**: 轮询失败达到 5 次后永久禁用

### 日志示例

```
[DEBUG] 使用 Cookie [1/3] (第1/3次, 轮询失败:0/5)
[DEBUG] Cookie 成功计数: 16/18 (重置轮询失败计数)
[DEBUG] 使用 Cookie [2/3] (第1/3次, 轮询失败:3/5)
[DEBUG] Cookie 轮询失败计数: 4/18 (轮询失败: 4/5)
[ERROR] Cookie [2] 轮询失败5次，已永久禁用
```

## 注意事项

1. **使用限制**: 不推荐大量滥用，账户可能有被封禁的风险
2. **延迟机制**: 会话删除前会有 3-5 秒的随机延迟，避免请求过于频繁
3. **cookie获取**: 目前cookie只能登陆账号后，从cookie中获取passport_token_key，故直接与你的美团账号挂钩，滥用可能会影响账号使用
4. **Cookie 安全**: 不要公开分享你的 Cookie 信息
5. **模型支持**: 目前支持 `LongCat` 和 `LongCat-Search（可搜索美团）` 两种模型
6. **Docker 部署**: 推荐使用 Docker 部署，便于管理和监控

## 开发与贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。
