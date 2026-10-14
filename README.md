<div align="center">

# ▲ Typeset Studio

**面向中文字文出版的确定性纯算法排版工作台 & 流水线渲染插件**  
*Deterministic Algorithmic Typesetting Studio & Pipeline Image Renderer for Chinese Publishing*

<p align="center">
  <a href="#-定位与核心哲学"><img src="https://img.shields.io/badge/Engine-%40chenglou%2Fpretext-emerald.svg?style=flat-square" alt="Pretext Engine"></a>
  <a href="#-运行环境与依赖要求"><img src="https://img.shields.io/badge/Runtime-Bun%20%E2%89%A5%201.2-000000.svg?style=flat-square&logo=bun" alt="Bun Runtime"></a>
  <a href="#-运行环境与依赖要求"><img src="https://img.shields.io/badge/Language-TypeScript%205.8-3178C6.svg?style=flat-square&logo=typescript" alt="TypeScript"></a>
  <a href="#-技术栈"><img src="https://img.shields.io/badge/UI-React%2019%20%2B%20Tailwind-61DAFB.svg?style=flat-square&logo=react" alt="React 19"></a>
  <a href="#-开发与测试"><img src="https://img.shields.io/badge/Tests-Bun-brightgreen.svg?style=flat-square" alt="Tests Passing"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="MIT License"></a>
</p>

[功能特性](#-特性亮点) • [运行环境](#-运行环境与依赖要求) • [快速开始](#-快速开始) • [Pipeline 插件集成](#-zzhub-pipeline-流水线插件接入) • [API 规范](#-api-规范与无头渲染) • [架构设计](#-架构设计与目录组织)

---

</div>

## 📖 定位与核心哲学

在内容自动化分发、微信公众号文章与小红书图文制作中，传统的卡片出图方案普遍依赖 **Chrome Headless (Puppeteer / Playwright)**。为了获取最佳排版效果，往往需要在浏览器实例中多次反复渲染、测量高度、试探字号并进行 CDP 通信截屏。这种方式**速度缓慢（单次耗时数秒）、内存占用高、排版结果难以量化微调**。

**Typeset Studio** 采取了完全不同的技术路线：**以确定性纯数学几何排版与服务端原生渲染为核心**。

- **⚡ 告别试探性重绘与 Chrome 依赖**：底层依托 `@chenglou/pretext`（纯数学文本分词测距）与 `@napi-rs/canvas`（基于 Rust Skia 的原生图形绘制引擎），彻底脱离无头浏览器。从计算到渲染直接输出高清 PNG，具备**毫秒级出图性能**、**系统原生字体支持**与**像素级确定性**。
- **🧩 双模态运行形态**：
  1. **独立可视化排版工作台 (Standalone Visual Studio)**：具备类 Vercel 极简黑白美学的 Web 设计器，支持多图瀑布流全景平铺、单图聚焦微调、四大标准出版比例切换、模板持久化与一键直接服务端渲染高清下载。
  2. **自动化发布流水线插件 (Pipeline Image Renderer Plugin)**：作为标准图像渲染插件，可无缝插拔接入 `zzhub-pipeline` 或任意 CI/CD 内容分发系统，直接通过原生 Canvas 生成图片，彻底替代笨重的 Chrome 截屏方案。

---

## ✨ 特性亮点

### 1. 📐 四大标准卡片出版规格
- **微信大图封面 (2.35:1)**：`2350 × 1000px`，专为公众号大图封面定制，强化大字视觉冲击力与主副标空间分割。
- **通用长图文 / 小红书 (3:4)**：`1080 × 1440px`，支持多页流式/显式切分、智能避让多图与目标填充率二分逼近。
- **通用宽屏 (16:9)**：`1920 × 1080px`，适用于技术博客 Banner、横版社交媒体卡片。
- **通用正方形 (1:1)**：`1200 × 1200px`，适用于金句摘录、名言卡片、社媒方图。

### 2. 🌊 8 大流式排版预设与自由图层 (Absolute Layer)
- **8 种流式避让算法**：自适应 (`auto`)、居左浮动 (`left`)、居右浮动 (`right`)、居中横幅 (`center`)、交错排版 (`staggered`)、角落软着陆 (`corner-soft`)、底部填满 (`fill`) 与自定义坐标 (`custom`)。
- **自由图层穿透**：一键将配图转为绝对定位自由图层，正文自动穿透排版流动，支持任意 `x/y`、宽高、`z-index`、旋转角度（`0~360°`）与透明度。

### 3. 🖼️ 多图瀑布流全景平铺与单图聚焦
- **多图全景平铺 (Overview Grid Auto-Fit)**：多页卡片时不再死板占满单屏，算法根据视口物理尺寸与卡片总数 $N$，动态计算最佳候选列数（1~4 列），两页并排、三页横排、四页网格，全景一览无余。
- **自由视图切换**：提供 `多图平铺 (Grid)` 与 `纵向单列 (Stack)` 一键切换。
- **单图放大聚焦**：配备 `聚焦单图` 按钮与**双击卡片直达**交互，随时平滑放大至单页全屏视口进行局部精修。

### 4. 📄 手动分页与精准配图归属
- **语法级分页**：支持在 Markdown 中任意位置插入 `【第二页】`、`【Page 2】` 或标准 Markdown 分隔符 `---`。
- **舞台边界安全保护 (`computeSafePresetY`)**：排版基准 Y 与页内序号严格绑定，杜绝全局 index 累加导致的坐标溢出，所有预设均在可视舞台内安全呈现。
- **配图所属页面与页内排序**：直观选择配图所属页码，支持页内一键上移/下移图层。

### 5. 💾 模板槽位体系与交集应用逻辑
- **三大标准模板槽位**：
  - `article_cover`（文章封面，默认 2.35:1）
  - `newspic_cover`（贴图封面，默认 3:4）
  - `newspic_content`（贴图内容，默认 3:4 多页）
- **账号隔离与平滑回退**：不同公众号/发布账号独立配置各槽位的默认模板；未配置时平滑降级至系统内置预设，程序绝不崩溃中断。
- **数量不匹配交集算法**：模板配图数与文章实际配图数不一致时安全应用交集（如 1 对多仅覆盖第 1 张，其余保留用户参数；2 对 1 忽略超出项）。

---

## 🛠️ 运行环境与依赖要求

### 1. 核心运行时
- **推荐运行环境**：[Bun](https://bun.sh/) `>= 1.2`（强烈推荐，启动仅需 5ms，原生支持 TypeScript 与 Watch 模式）
- **兼容运行环境**：Node.js `>= 20.0` (搭配 `tsx` 或预编译)

### 2. 底层关键依赖
| 依赖包 | 版本 | 角色与用途 |
| :--- | :--- | :--- |
| **`@chenglou/pretext`** | `^0.0.8` | 核心文本分词、字符测量与折行计算引擎（纯数学无 DOM 依赖） |
| **`@napi-rs/canvas`** | `^1.0.10` | 服务端极速图形渲染（Rust 预编译二进制，免去复杂的系统级 Cairo 编译） |
| **`hono`** | `^4.7.4` | 超轻量级 Web/API 框架，托管 API 接口与静态资源 |
| **`react` / `react-dom`** | `^19.0.0` | 现代化声明式组件与状态管理 |
| **`tailwindcss`** | `^3.4.17` | 高性能极简黑白美学原子化样式 |
| **`lucide-react`** | `^1.16.0` | 精致图标库 |

---

## 🚀 快速开始

### 1. 克隆与安装依赖

```bash
git clone https://github.com/k7airos/typeset-studio.git
cd typeset-studio

# 使用 Bun 一键安装
bun install
```

### 2. 运行单进程全功能服务 (推荐)

单进程同时托管后端 API 与前端 Web 工作台：

```bash
bun run server
```

服务启动后输出端口信息，管理员密钥保存在环境变量或 `.env` 中：
```text
┌────────────────────────────────────────────────────────┐
│               ⚡ Typeset Studio Server                 │
├────────────────────────────────────────────────────────┤
│  Web URL:    http://localhost:4890                   │
│  Protected:  X-Admin-Key header required               │
└────────────────────────────────────────────────────────┘
```
在浏览器中打开 **`http://localhost:4890`** 即可立即体验！

### 3. 前后端联调热更新模式

如需修改前端界面或核心算法并享受毫秒级 HMR：

```bash
# 同时启动后端 Watch 与前端 Vite HMR (5173 端口)
bun run dev:all
```

---

## 🔌 `zzhub-pipeline` 流水线插件接入

Typeset Studio 专为现代发布管线（如 `zzhub-pipeline`）设计，可直接作为 `imageRenderer` 插件无缝替换原有的 Chrome 截屏机制。

### 1. 使用内置适配器

在流水线项目安装 npm 包：

```bash
npm install @akairos/typeset-studio
```

在 `zzhub-pipeline` 的 `config.json` 中启用内置适配器：

```json
{
  "plugins": {
    "imageRenderer": "@akairos/typeset-studio/adapter"
  }
}
```

源码联调也可将 `imageRenderer` 指向本项目的 `src/adapter.ts` 或构建后的 `dist/lib/adapter.js`。

默认使用本地原生 Canvas。需要独立渲染服务时，在流水线进程设置 `TYPESET_STUDIO_URL` 和 `TYPESET_ADMIN_KEY`，适配器会传输本地图片并保存返回的 PNG。

配置后执行 `zzp render --state ...` 或 `zzp run` 即可使用该插件。

---

## 📡 API 规范与无头渲染

服务端在 `4890` 端口提供标准 RESTful API，用于脚本批量出图与第三方集成。

### 1. 服务健康检查 (`GET /api/health`)
```bash
curl http://localhost:4890/api/health
# {"status":"ok","name":"Typeset Studio Server","version":"0.2.5"}
```

### 2. 槽位解析与排版 (`POST /api/render`)
```bash
curl -X POST http://localhost:4890/api/render \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_KEY>" \
  -d '{
    "slot": "article_cover",
    "account": "default",
    "title": "纯算法排版实战",
    "markdown": "# 纯算法排版实战\n无需设计师介入，自动排版对齐",
    "highlightWords": ["算法", "排版"]
  }'
```

### 3. 服务端原生 Canvas 生成 PNG (`POST /api/render/png`)
直接返回二进制 raw `image/png` 数据流，单次响应仅数十毫秒，0 浏览器内存开销：
```bash
curl -X POST http://localhost:4890/api/render/png \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_KEY>" \
  -d '{
    "markdown": "# 纯算法排版实战\n无需设计师介入，自动排版对齐",
    "slot": "article_cover",
    "templateKey": "tpl_wechat_cover_editorial"
  }' \
  --output cover.png
```

### 4. 批量导出图片 (`POST /api/render/export`)
批量输出各页 DataURL/Base64 图片，供前端一键打包或无头存储：
```bash
curl -X POST http://localhost:4890/api/render/export \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <ADMIN_KEY>" \
  -d '{
    "markdown": "# 页面一\n这是第一页\n\n---\n\n# 页面二\n这是第二页",
    "slot": "newspic_content",
    "config": { "aspectRatio": "longform-3-4" }
  }'
# 返回 {"ok": true, "pageCount": 2, "pages": [{ "pageNumber": 1, "dataUrl": "..." }, ...]}
```

### 5. 模板槽位查询与管理 (`GET /api/templates/slots`)
```bash
curl "http://localhost:4890/api/templates/slots?account=default" \
  -H "X-Admin-Key: <ADMIN_KEY>"
```

### 6. 上传素材配图 (`POST /api/upload`)
```bash
curl -X POST http://localhost:4890/api/upload \
  -H "X-Admin-Key: <ADMIN_KEY>" \
  -F "file=@/path/to/image.png"
```

---

## 🏛️ 架构设计与目录组织

```text
typeset-studio/
├── src/
│   ├── core/                  # 纯算法排版核心（无 DOM 依赖，通用跨端）
│   │   ├── engine.ts          # runTypeset 排版主入口，协调分词、样式、分段与分页
│   │   ├── pretext.ts         # Pretext 引擎封装与富文本行宽切分
│   │   ├── canvas-renderer.ts # @napi-rs/canvas 服务端原生渲染器（免 Chrome 出图）
│   │   ├── obstacle-flow.ts   # 矩形障碍物碰撞检测与避让流排版算法
│   │   ├── image-layout.ts    # 预设布局坐标计算 (computeSafePresetY) 与边界保护
│   │   ├── typography.ts      # 跨平台字体回退映射与多阶字号行高计算
│   │   ├── template.ts        # 模板持久化应用与数量不匹配时的交集算法
│   │   ├── geometry.ts        # 4 大标准画布比例几何计算 (2.35:1, 3:4, 16:9, 1:1)
│   │   └── types.ts           # 完整 TypeScript 类型契约
│   │
│   ├── server/                # Hono 后端服务（运行于 Bun，提供持久化与无头渲染 API）
│   │   ├── index.ts           # 服务入口（端口 4890），鉴权、静态托管与路由挂载
│   │   ├── auth.ts            # X-Admin-Key 动态管理与免密机制
│   │   └── routes/
│   │       ├── templates.ts   # 模板 CRUD 与槽位配置
│   │       ├── render.ts      # 无头渲染接口（支持模板 Key / ID / 槽位解析）
│   │       └── upload.ts      # 本地配图素材上传
│   │
│   └── web/                   # Web 可视化排版工作台（React 19 + Tailwind CSS + Lucide）
│       ├── App.tsx            # 全局工作台布局与视口自适应缩放驱动
│       ├── components/
│       │   ├── Header.tsx           # 顶部比例切换、缩放工具条、自适应按钮、模板与导出
│       │   ├── EditorSidebar.tsx    # 左侧内容编辑区（Markdown、配图卡片、高亮词）
│       │   ├── CanvasViewport.tsx   # 中间画布视口（多图瀑布流平铺、双击聚焦单图）
│       │   ├── ParamsInspector.tsx  # 右侧算法参数、字阶、主题配色、水印边框检查器
│       │   └── TemplateModal.tsx    # 模板管理模态框（保存、查看、应用、删除）
│       └── hooks/
│           └── useTypeset.ts        # 响应式排版状态与实时防抖计算 Hook
│
├── data/                      # 预设模板与持久化数据
├── dist/                      # Vite 生产打包产物（由 server 单进程统一托管）
└── package.json
```

---

## 🧪 开发与测试

Typeset Studio 保持着严格的单元测试覆盖：

```bash
# 运行全部算法与路由单元测试
bun test

# 监听模式运行单测
bun run test:watch

# 生产环境打包
bun run build
```

**测试套件概览**：
- `src/core/page-images.test.ts`：多页配图分配、自由图层分配、页内顺序验证
- `src/core/template.test.ts`：模板持久化、配图数量交集应用逻辑验证
- `src/core/image-layout.test.ts`：流式排版预设坐标、Page 2 边界安全与陈旧坐标免疫验证
- `src/server/routes/slots.test.ts`：三大默认模板槽位、账号配置隔离与回退容错验证
- **当前状态**：`24 / 24` 单元测试通过率 100%。

---

## 📄 开源协议

本项目基于 [MIT 协议](./LICENSE) 开源。

### 鉴权与 pipeline 参数

业务 API（模板、上传、排版）均要求 `X-Admin-Key`。本机编辑器通过真实回环连接自动领取密钥；远程编辑器需在设置中填写密钥。密钥来自 `TYPESET_ADMIN_KEY` 或服务目录的 `.env`，跨域网页不能自动领取。反向代理应使用业务域名，并保留原始 Host。

远程插件设置 `TYPESET_STUDIO_URL` 与 `TYPESET_ADMIN_KEY`。插件会传输本地图片字节；`/uploads/` 路径表示远程服务的上传文件。`TYPESET_DATA_DIR` 统一控制模板、默认配置和上传文件目录。

插件的模板选择顺序为：`studioTemplates.cover/content` → 旧调用中的具体 `template` 名称 → 当前账号的用途槽位默认模板。`wechat-cover-split`、`poster-3-4`、`longform-3-4` 只表示 pipeline 渲染模式，不作为 Studio 模板名查询。未知模板会报错。

插件以有效的 Studio 模板样式为准，pipeline 的 `theme`、`coverTheme`、账号配色、字体、署名和图标不会覆盖已选模板。直接调用渲染 API 时，默认仍允许显式 `config` 覆盖；传 `preserveTemplateStyle: true` 可保留模板样式。页数和逐页填充率约束仍然生效。

`minPages`/`maxPages`（0 表示不设置业务上限）和 `pageSpecs.targetFillRatio` 参与正文分页。填充率决定文字可用高度，少页约束尝试将正文分配到更多页面；无法满足时明确报错，不截断文字。引擎最多生成 50 页以避免失控。手动分页段落溢出时继续分页，段落图片保留在该段首页，最终页码连续。`onProgress` 在排版开始、封面和正文生成后报告阶段及实际页数。

服务默认绑定 `127.0.0.1`；需要局域网或远程访问时设置 `TYPESET_HOST=0.0.0.0`。反向代理请求不能自动取钥。

### 固定模板素材

在编辑器上传图片后，在图片卡片开启“固定模板素材”，填写同一模板内唯一的标识（如 `background`、`logo`，仅字母、数字、下划线和短横线）。自由图层模式下，勾选“设为整页背景”可将图片放到文字下方并铺满当前画布；取消勾选恢复勾选前的布局。点击“重置布局”恢复本次上传或应用模板时的尺寸、位置和图层设置，图片来源、说明和素材标识不变。保存模板后，新内容会沿用这些设置；文字按实际内容重新换行、分页。

固定素材默认按最终输出页码放置，未指定页码视为第 1 页。“每页重复”仅允许自由图层开启，切回 Flow 模式自动关闭；接口同样拒绝 Flow 素材重复。开启后会出现在该模板的全部输出页，包括自动溢出的续页。重复素材不独立制造页面，也不占普通配图数量。封面和正文分别使用各自的模板，正文模板的第 1 页从正文开始计算。

普通输入图片只匹配模板的普通图片位置；固定素材默认保留模板中的来源。重新应用或切换模板会替换之前的固定素材。未标记的旧模板图片保留原替换规则，无需迁移。

渲染 API 可按标识替换当前请求的素材，布局仍使用模板设置，不回写模板文件：

```json
{
  "template": "tpl_my_cover",
  "markdown": "# 新标题",
  "preserveTemplateStyle": true,
  "templateImageOverrides": {
    "background": "/absolute/path/new-background.png"
  }
}
```

Pipeline 插件输入新增以下可选字段：

```ts
studioTemplates: { cover: "tpl_my_cover", content: "tpl_my_content" },
templateImageOverrides: {
  cover: { background: "/absolute/path/new-background.png" },
  content: { logo: "https://example.com/logo.png" },
},
```

对应的 pipeline 命令（需使用支持这些参数的 pipeline 源码或本地安装）：

```bash
zzp render --state /absolute/path/workflow-state.json \
  --studio-cover-template tpl_my_cover \
  --studio-content-template tpl_my_content \
  --template-images-file /absolute/path/template-images.json
```

`template-images.json` 内容：

```json
{
  "cover": { "background": "./new-background.png" },
  "content": { "logo": "https://example.com/logo.png" }
}
```

选择和映射保存在任务的 `intent.studio_render`，重跑继续使用。模板参数传 `""` 清除任务选择、恢复槽位默认；映射文件整体替换任务原映射，传 `{}` 清除全部替换。相对路径按映射文件所在目录解析。固定素材独立于 `bodyImages`，不进入正文配图等待、标记过滤或“每页必须有正文配图”的计数。

模板只保存文件或 URL 引用，不嵌入、不自动打包迁移。`/uploads/...` 由实际渲染方的 `TYPESET_DATA_DIR` 解析，本地插件和编辑器应使用同一目录；远程模式使用服务端目录。模板中的绝对路径必须在渲染机器存在，HTTP URL 必须可访问。远程调用会传输任务替换中本地文件的字节，但不会复制原模板素材。缺失固定素材、未知替换标识或重复标识会明确报错，终止出图。

固定素材和模板优先渲染已随 `@akairos/typeset-studio@0.2.5` 发布。正式 Pipeline 使用 npm 入口；本地源码入口仅用于联调未发布的改动。运行时模板和上传图片不打进 npm 包，应通过 Pipeline 运行时配置包同步。
