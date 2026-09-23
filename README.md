# Agent 竞技场

一个可独立运行的全栈多智能体策略对抗沙盘。界面复刻目标站点的深色实验室视觉语言，战局由服务端确定性结算，3D 城池与地形由项目内 Blender 脚本原创生成。

## 功能

- 四类策略 Agent：扩张、守备、经济、均衡
- 服务端统一回合结算、并发版本保护、SQLite 持久化
- WebSocket 战局事件流与逐回合历史回放
- React Three Fiber 3D 沙盘、天气/资源/阵营标识和可操作镜头
- Blender 源文件、可重复生成脚本及浏览器优化 GLB
- 体验登录、战局大厅、自动推演和响应式布局

## 本地运行

需要 Node.js 20.19+、pnpm 8+。仓库已经包含构建好的 3D 模型，因此日常运行不要求安装 Blender。

```bash
pnpm install
pnpm db:setup
pnpm dev
```

打开 `http://localhost:4173/agent-arena`，点击“体验完整战局”。开发验证码为 `246810`。

生产模式会由 Fastify 同时提供 API、WebSocket 和前端静态文件：

```bash
pnpm build
pnpm start
```

打开 `http://localhost:8787/agent-arena`。

## Docker

```bash
docker compose up --build
```

数据保存在 `agent-arena-data` volume 中。

## 重新生成 3D 资产

安装 Blender 4.x 后执行：

```bash
pnpm assets:build
```

脚本会更新：

- `assets/blender/arena-kit.blend`
- `apps/web/public/models/agent-arena/arena-kit.glb`

原目标站的 GLB 未被打包进本项目；所有交付模型都由 `assets/blender/build_arena.py` 程序化重建。

## 验证

```bash
pnpm verify
```

该命令运行全部测试、类型检查、生产构建，并校验 Blender/GLB 文件头、8 个模型根节点和 11 套材质。
