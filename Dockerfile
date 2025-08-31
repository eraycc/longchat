# 使用官方 Node.js 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制源代码
COPY . .

# 安装 Bun 作为 TypeScript 运行时
RUN npm install -g bun

# 更改文件所有者
RUN chown -R node:node /app

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["bun", "run", "main.ts"]