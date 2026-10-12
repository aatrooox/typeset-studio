# 本地字体目录 (Local Fonts Directory)

欢迎使用 Typeset Studio 本地字体资产管理！

## 使用方法 (How to Use)
将任何中英文字体文件（`.ttf`、`.otf`、`.woff2`、`.woff`）放入本目录即可：

```text
public/fonts/
  ├── AlimamaFangYuanTiVF-Thin.ttf
  ├── SmileySans-Oblique.ttf
  ├── SourceHanSansSC-Medium.otf
  └── fonts.json (可选：自定义显示别名)
```

## 自动生效特性 (Features)
1. **自动扫描识别**：系统会自动解析字体内部的 OpenType 元数据（Family Name），并在排版面板的“字体与排版字阶”下拉菜单中自动展示。
2. **前端秒级加载**：浏览器自动注册为 Web 字体（`FontFace` API），无需外部 CDN，零延迟渲染。
3. **服务端 100% 像素级对齐**：服务端生图引擎（`@napi-rs/canvas`）会自动将其注册至 Skia 字体引擎，彻底消除跨平台/Linux 服务器上的乱码和字形偏移。

## 可选配置：自定义显示名称 (Optional `fonts.json`)
如果你希望给字体指定更友好的中文名称，可在本目录创建 `fonts.json`：

```json
{
  "AlimamaFangYuanTiVF-Thin.ttf": {
    "family": "AlimamaFangYuanTi",
    "label": "阿里妈妈方圆体 (现代亲和·极简)"
  },
  "SmileySans-Oblique.ttf": {
    "family": "Smiley Sans",
    "label": "得意黑 (Smiley Sans·倾斜精修)"
  }
}
```
