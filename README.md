# 井字棋在线游戏

这是一个简洁的网页版井字棋游戏，支持在线多人游戏。

## 功能

- 创建游戏房间
- 通过房间代码邀请好友加入
- 实时游戏对战
- 响应式设计，适配手机和电脑

## 技术栈

- Next.js - React框架
- Tailwind CSS - 样式
- Socket.io - 实时通信
- TypeScript - 类型安全

## 开始使用

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 如何游玩

1. 第一个玩家创建房间
2. 系统生成一个6位数的房间代码
3. 第一个玩家将房间代码分享给好友
4. 好友输入房间代码加入游戏
5. 房主开始游戏
6. 轮流下棋，直到有人胜利或平局

## 部署

你可以将此应用部署到任何支持Node.js的平台：

- Vercel
- Netlify
- Heroku
- 或者自己的服务器

注意：如果你在本地网络之外的环境中部署游戏，确保在Socket.io的配置中正确设置CORS选项。

## 联系方式

如有任何问题或建议，欢迎联系：

- 电子邮件：example@example.com
- GitHub：[你的GitHub](https://github.com/yourusername)
