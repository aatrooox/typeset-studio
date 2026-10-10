# Typeset Studio 纯算法排版工作台

通用纯算法排版与视觉设计工具。基于 `@chenglou/pretext` 和无 DOM 几何避让算法构建，支持 60fps 实时排版预览、四大画板规格、模板持久化与无头渲染 API。

## 特性亮点

- **⚡ 纯算法即时排版 (60fps)**：基于 Canvas 字符分词测距与矩形障碍物几何绕排算法，零 DOM 回流依赖，前端拖拽滑块 0 延迟实时排版。
- **📐 四大核心画板比例**：
  - **微信文章封面 (2.35:1)**：2350 × 1000px，大字张力、主副标视觉分割。
  - **通用长图文 (3:4)**：1080 × 1440px，多页流式/显式分页、避让多图、目标填充率二分优化。
  - **通用宽屏 (16:9)**：1920 × 1080px，推特/社媒卡片、左右分栏排版。
  - **通用正方形 (1:1)**：1200 × 1200px，金句卡片、次条方图、小红书首图。
- **✨ 类 Vercel 极简设计美学**：黑白单色风格、高对比度微光边框、Segmented 比例切换器、三栏工作台布局。
- **🔒 简易自用超管鉴权**：启动自动生成或读取 `TYPESET_ADMIN_KEY`，前端存入本地，安全自用。
- **💾 模板持久化与复用**：一键保存当前参数与尺寸为本地模板 JSON，随开随用，秒级换图换字。
- **🔌 自动化出图 API**：提供 `POST /api/render`，可作为标准 Adapter 供外部脚本或 `zzhub-pipeline` 无缝调用。

---

## 快速开始

### 1. 启动全功能服务（前端静态资源 + 后端 API）

```bash
# 启动 Bun 服务端（默认端口 4890）
bun run server
```

服务启动后，控制台会输出服务地址与管理员密钥：
```text
┌────────────────────────────────────────────────────────┐
│               ⚡ Typeset Studio Server                 │
├────────────────────────────────────────────────────────┤
│  API Port:   http://localhost:4890                   │
│  Admin Key:  tsk_xxxxxxxxxxxxxxxx                      │
│  Protected:  X-Admin-Key header required               │
└────────────────────────────────────────────────────────┘
```
在浏览器中打开 `http://localhost:4890` 即可开始使用！

### 2. 前端独立开发模式（支持 HMR）

```bash
# 终端 1：启动 API 后端
bun run server

# 终端 2：启动 Vite 开发服务器（端口 5173，自动反代 4890）
bun run dev
```

---

## API 接口与无头出图调用

### 1. 无头排版与渲染 (`POST /api/render`)

用于脚本换图、生成预览或接入 pipeline：

```bash
curl -X POST http://localhost:4890/api/render \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <YOUR_ADMIN_KEY>" \
  -d '{
    "templateId": "tpl_wechat_cover_editorial",
    "markdown": "# 纯算法排版实战\n无需设计师介入，自动排版对齐",
    "images": [
      {
        "src": "https://example.com/illustration.png",
        "alt": "插画",
        "caption": "图1: 几何流式布局"
      }
    ]
  }'
```

### 2. 模板列表 (`GET /api/templates`)

```bash
curl http://localhost:4890/api/templates -H "X-Admin-Key: <YOUR_ADMIN_KEY>"
```

### 3. 上传图片素材 (`POST /api/upload`)

```bash
curl -X POST http://localhost:4890/api/upload \
  -H "X-Admin-Key: <YOUR_ADMIN_KEY>" \
  -F "file=@/path/to/image.png"
```

---

## 接入 `zzhub-pipeline` 方案

在 `zzhub-pipeline` 中，只需要实现一个适配器接入 `config.plugins.imageRenderer`：

```typescript
// zzhub-pipeline/src/adapters/typeset-studio-adapter.ts
import type { ImageRenderPlugin } from "../adapter-types";

export const typesetStudioAdapter: ImageRenderPlugin = {
  name: "typeset-studio",
  version: "1.0.0",
  async render(input) {
    const res = await fetch("http://localhost:4890/api/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": process.env.TYPESET_ADMIN_KEY!,
      },
      body: JSON.stringify({
        markdown: input.bodyText,
        images: input.bodyImages,
      }),
    });
    const { result } = await res.json();
    // 将生成的图片写入 input.outputDir 并返回
    return {
      assets: [...],
      pageCount: result.pageCount,
    };
  },
};
```
