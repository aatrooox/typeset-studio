# Typeset Studio 维护入口

更新日期：2026-10-15。源码及 npm 基线 `@akairos/typeset-studio@0.2.6`。用户入口见 [README](README.md)，当前契约以 `src/adapter.ts`、`src/core/types.ts` 和服务路由为准。

## 职责与生态

本包将正文、图片和模板排版成 PNG，可独立使用工作台，也可供 [Pipeline](https://github.com/k7airos/zzhub-pipeline) 作为 `imageRenderer` 调用。[myno](https://github.com/k7airos/myno) 负责正文编辑、微信 HTML 和样式配置，两者互补，互不依赖。Typeset Studio 不上传微信素材、不写草稿箱。

引擎使用 `@chenglou/pretext`，PNG 使用 `@napi-rs/canvas`；图像生成不需要 Chrome。独立 HTTP 服务是 Bun/Hono，前端是 React/Vite；不要把 Node 库入口等同于 Node 可运行整个 Bun 服务。

## 关键入口

| 模块 | 文件 | 职责 |
| --- | --- | --- |
| 公共 API | `src/index.ts` | 排版、Canvas 渲染、字体与适配器导出 |
| Pipeline 适配器 | `src/adapter.ts` | 封面与内容页、模板选择、素材替换、进度 |
| 排版引擎 | `src/core/engine.ts` | 分段、分页、文字和图片布局 |
| Canvas | `src/core/canvas-renderer.ts` | PNG 与图层绘制 |
| 数据根目录 | `src/core/data-dir.ts` | `TYPESET_DATA_DIR` 与默认目录解析 |
| HTTP 服务 | `src/server/index.ts` | 静态页面、鉴权与 API，默认 4890 |
| 模板/API | `src/server/routes/templates.ts`、`src/server/routes/render.ts` | 模板、槽位与请求解析 |
| 工作台状态 | `src/web/hooks/useTypeset.ts` | 编辑、模板、图片布局和重置 |

## 当前插件契约

Pipeline 使用 `@akairos/typeset-studio/adapter`，其 `options.dataDir` 桥接到子进程 `TYPESET_DATA_DIR`。不需独立 HTTP 服务或管理员密钥；Pipeline 屏蔽 `TYPESET_STUDIO_URL` / `TYPESET_ADMIN_KEY`，保证本地 npm 执行。直接调用本包的远程模式才使用这两个变量。

- 用途槽位为 `article_cover`、`newspic_cover`、`newspic_content`。
- 显式 `studioTemplates.cover/content` 优先，再到旧调用的具体模板名、账号槽位、全局默认与算法默认。未知显式模板报错。
- 保留有效模板样式；任务页数、逐页填充率与素材替换仍参与渲染。
- 固定素材通过 `templateAssetKey` 标识；每页重复仅支持自由图层，不占正文配图数量。
- 背景取消恢复切换前布局，布局重置恢复上传或模板应用时的基线。
- `pageCount` / `pages` 摘要内容页，`assets` 可能另外包含封面，不用 `assets.length` 推导内容页数。

## 数据与部署

`templates/*.json` 是模板，`default-template.json` 是默认槽位，`uploads/` 保存本地图片字节。模板 JSON 不内嵌原图；只复制 JSON 不会迁移素材。独立编辑器与插件应使用同一数据目录，包目录之外的持久化目录更适合升级。

Pipeline 可通过 `typeset-assets-sync` 上传引用素材并导出带哈希的运行时包。部署脚本由调用方维护，不要求私有基础设施仓库。运行时数据和用户模板不打进本包 npm 发布物；不要提交本地模板编辑或同步生成记录来完成代码/文档任务。

```bash
bun install
bun run build
TYPESET_DATA_DIR=/absolute/path/typeset-data bun run server
# 前后端开发：使用相同 TYPESET_DATA_DIR 执行 bun run dev:all
```

HTTP 业务 API 需要 `X-Admin-Key`。本机编辑器仅通过真实回环连接领取密钥；服务鉴权与 npm 插件调用是两个入口。

测试只按本次改动范围运行，历史测试数量、延迟和旧的后台服务状态不作为当前结论。版本升级与源码修改后应分别核对独立 API 和实际 Pipeline 插件路径。
