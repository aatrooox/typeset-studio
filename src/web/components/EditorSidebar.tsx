import React, { useRef, useState } from "react";
import {
  FileText,
  Heading1,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Layers,
  Sparkles,
  RotateCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { FlowImage } from "../../core/types";

interface EditorSidebarProps {
  markdown: string;
  onMarkdownChange: (text: string) => void;
  images: FlowImage[];
  onAddImage: (img: Omit<FlowImage, "id">) => void;
  onUpdateImage: (id: string, partial: Partial<FlowImage>) => void;
  onRemoveImage: (id: string) => void;
  onMoveImage?: (id: string, direction: "up" | "down") => void;
  pageCount?: number;
  highlightWords: string[];
  onHighlightWordsChange: (words: string[]) => void;
  adminKey: string;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  markdown,
  onMarkdownChange,
  images,
  onAddImage,
  onUpdateImage,
  onRemoveImage,
  onMoveImage,
  pageCount = 1,
  highlightWords,
  onHighlightWordsChange,
  adminKey,
}) => {
  const [activeTab, setActiveTab] = useState<"text" | "images" | "highlights">("text");
  const [newHighlight, setNewHighlight] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const insertSnippet = (snippet: string) => {
    onMarkdownChange(markdown ? `${markdown}\n\n${snippet}` : snippet);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 上传失败时仍可用本地图片继续编辑。
    const addUploadedImage = (src: string) => onAddImage({
      src,
      alt: file.name,
      caption: "",
      x: 40,
      y: 400,
      width: 440,
      height: 300,
      captionHeight: 36,
      layoutPreset: "auto",
    });
    const readLocalImage = () => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") addUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    };

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: adminKey ? { "x-admin-key": adminKey } : {},
        body: formData,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        addUploadedImage(data.url);
      } else {
        readLocalImage();
      }
    } catch {
      readLocalImage();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddHighlightWord = () => {
    if (!newHighlight.trim()) return;
    if (!highlightWords.includes(newHighlight.trim())) {
      onHighlightWordsChange([...highlightWords, newHighlight.trim()]);
    }
    setNewHighlight("");
  };

  const handleRemoveHighlightWord = (word: string) => {
    onHighlightWordsChange(highlightWords.filter((w) => w !== word));
  };

  return (
    <aside className="w-80 border-r border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] flex flex-col shrink-0 select-none transition-colors">
      {/* Tabs */}
      <div className="flex border-b border-[#eaeaea] dark:border-[#222222] bg-[#f9f9f9] dark:bg-[#050505] p-1 gap-1">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded font-medium transition-all ${
            activeTab === "text"
              ? "bg-white dark:bg-[#1f1f1f] text-black dark:text-white shadow-sm font-semibold"
              : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-[#cccccc]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>正文</span>
        </button>

        <button
          onClick={() => setActiveTab("images")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded font-medium transition-all ${
            activeTab === "images"
              ? "bg-white dark:bg-[#1f1f1f] text-black dark:text-white shadow-sm font-semibold"
              : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-[#cccccc]"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>配图 ({images.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("highlights")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded font-medium transition-all ${
            activeTab === "highlights"
              ? "bg-white dark:bg-[#1f1f1f] text-black dark:text-white shadow-sm font-semibold"
              : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-[#cccccc]"
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>重点词</span>
        </button>
      </div>

      {/* Tab 1: Markdown Text Editor */}
      {activeTab === "text" && (
        <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
          {/* Quick Insert Snippets Toolbar */}
          <div className="flex items-center gap-1 pb-1 flex-wrap border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
            <button
              onClick={() => insertSnippet("# 标题")}
              className="px-2 py-1 bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#eaeaea] dark:hover:bg-[#202020] text-[#555555] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
              title="插入主标题"
            >
              <Heading1 className="w-3 h-3" />
              <span>H1</span>
            </button>
            <button
              onClick={() => insertSnippet("## 二级标题")}
              className="px-2 py-1 bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#eaeaea] dark:hover:bg-[#202020] text-[#555555] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
              title="插入副标题"
            >
              <Heading2 className="w-3 h-3" />
              <span>H2</span>
            </button>
            <button
              onClick={() => insertSnippet("> 引用格言名句...")}
              className="px-2 py-1 bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#eaeaea] dark:hover:bg-[#202020] text-[#555555] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white rounded text-[11px] font-mono transition-colors"
              title="插入引用块"
            >
              Quote
            </button>
            <button
              onClick={() => insertSnippet("【第二页】")}
              className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
              title="显式分页标记"
            >
              <Layers className="w-3 h-3" />
              <span>分页面</span>
            </button>
          </div>

          {/* Text Area */}
          <textarea
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            placeholder="在此输入 Markdown 内容，纯算法即时排版..."
            className="flex-1 w-full bg-[#fafafa] dark:bg-[#0d0d0d] border border-[#eaeaea] dark:border-[#222222] rounded-lg p-3 text-xs font-mono text-[#171717] dark:text-[#ededed] placeholder-[#999999] dark:placeholder-[#444444] resize-none focus:outline-none focus:border-black dark:focus:border-[#444444] transition-all leading-relaxed"
          />

          <div className="flex items-center justify-between text-[11px] text-[#888888] dark:text-[#555555] font-mono px-1">
            <span>字符数: {markdown.length}</span>
            <span>行数: {markdown.split("\n").length}</span>
          </div>
        </div>
      )}

      {/* Tab 2: Images Management */}
      {activeTab === "images" && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Upload Button */}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[#d4d4d4] dark:border-[#333333] hover:border-black dark:hover:border-[#555555] bg-[#fafafa] dark:bg-[#0f0f0f] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] text-xs text-[#555555] dark:text-[#cccccc] hover:text-black dark:hover:text-white transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? "正在上传..." : "上传配图素材"}</span>
            </button>

            <button
              onClick={() =>
                onAddImage({
                  src: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
                  alt: "艺术插画",
                  caption: "示例艺术配图",
                  x: 36,
                  y: 400,
                  width: 440,
                  height: 300,
                  captionHeight: 36,
                  layoutPreset: "auto",
                })
              }
              className="px-3 py-2.5 rounded-lg border border-[#eaeaea] dark:border-[#222222] bg-[#fafafa] dark:bg-[#0f0f0f] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white transition-all"
              title="插入在线示例图"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Image Cards */}
          <div className="flex flex-col gap-2.5">
            {images.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#888888] dark:text-[#555555]">
                暂无配图素材，点击上方按钮上传或插入
              </div>
            ) : (
              images.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-[#fafafa] dark:bg-[#0f0f0f] border border-[#eaeaea] dark:border-[#222222] rounded-lg p-2.5 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-12 h-12 object-cover rounded bg-[#eeeeee] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1 rounded bg-[#eaeaea] dark:bg-[#262626] font-mono text-[#555555] dark:text-[#aaaaaa] font-semibold shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-medium text-[#171717] dark:text-white truncate max-w-[120px]">
                          {img.caption || img.alt || `配图 #${idx + 1}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                          第 {img.pageIndex || 1} 页
                        </span>
                      </div>
                      <div className="text-[10px] text-[#888888] dark:text-[#666666] font-mono mt-0.5">
                        {img.width} × {img.height}px · X: {img.x ?? 0}, Y: {img.y ?? 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onMoveImage?.(img.id, "up")}
                        disabled={idx === 0}
                        className="p-1 text-[#888888] hover:text-black dark:hover:text-white disabled:opacity-20 rounded hover:bg-[#eeeeee] dark:hover:bg-[#1f1f1f]"
                        title="上移顺序 (调整在同一页中的先后次序)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveImage?.(img.id, "down")}
                        disabled={idx === images.length - 1}
                        className="p-1 text-[#888888] hover:text-black dark:hover:text-white disabled:opacity-20 rounded hover:bg-[#eeeeee] dark:hover:bg-[#1f1f1f]"
                        title="下移顺序 (调整在同一页中的先后次序)"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemoveImage(img.id)}
                        className="p-1 text-[#888888] hover:text-red-500 rounded hover:bg-[#eeeeee] dark:hover:bg-[#1f1f1f]"
                        title="删除该图"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mode Selector: Flow vs Absolute */}
                  <div className="flex bg-[#eeeeee] dark:bg-[#1a1a1a] p-0.5 rounded text-[11px] font-medium pt-1 border-t border-[#eeeeee] dark:border-[#1a1a1a]">
                    <button
                      onClick={() => onUpdateImage(img.id, { isAbsolute: false })}
                      className={`flex-1 py-1 rounded transition-all text-center ${
                        !img.isAbsolute
                          ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                          : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                      }`}
                    >
                      绕排避让 (Flow)
                    </button>
                    <button
                      onClick={() =>
                        onUpdateImage(img.id, {
                          isAbsolute: true,
                          layoutPreset: "custom",
                          zIndex: img.zIndex ?? 15,
                          rotate: img.rotate ?? 0,
                          opacity: img.opacity ?? 1,
                        })
                      }
                      className={`flex-1 py-1 rounded transition-all text-center ${
                        img.isAbsolute
                          ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                          : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                      }`}
                    >
                      自由图层 (Absolute)
                    </button>
                  </div>

                  {!img.isAbsolute ? (
                    <>
                      {/* Flow Settings */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">排版预设</span>
                          <select
                            value={img.layoutPreset || "auto"}
                            onChange={(e) =>
                              onUpdateImage(img.id, { layoutPreset: e.target.value as FlowImage["layoutPreset"] })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] focus:outline-none"
                          >
                            <option value="auto">自适应 (Auto)</option>
                            <option value="mid-left">居左浮动 (Left)</option>
                            <option value="mid-right">居右浮动 (Right)</option>
                            <option value="center">居中横幅 (Center)</option>
                            <option value="staggered">交错排版 (Staggered)</option>
                            <option value="corner-soft">角落软着陆 (Corner)</option>
                            <option value="fill">底部填满 (Fill)</option>
                            <option value="custom">自定义坐标 (Custom)</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-[#666666] block mb-1">所属页面</span>
                          <select
                            value={img.pageIndex || 1}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                pageIndex: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] focus:outline-none"
                          >
                            {Array.from({ length: Math.max(pageCount, 2) }, (_, i) => i + 1).map((p) => (
                              <option key={p} value={p}>
                                第 {p} 页 {p === 1 ? "(首页/封面)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Size & Position Fine-tuning */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">宽度 (W)</span>
                          <input
                            type="number"
                            min="50"
                            step="10"
                            value={img.width ?? 420}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                width: Math.max(50, parseInt(e.target.value, 10) || 50),
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[#666666] block mb-1">高度 (H)</span>
                          <input
                            type="number"
                            min="50"
                            step="10"
                            value={img.height ?? 280}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                height: Math.max(50, parseInt(e.target.value, 10) || 50),
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">纵向位置 Y</span>
                          <input
                            type="number"
                            step="20"
                            value={img.y ?? 300}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                y: parseInt(e.target.value, 10) || 0,
                                layoutPreset: "custom",
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[#666666] block mb-1">横向坐标 X</span>
                          <input
                            type="number"
                            step="10"
                            value={img.x ?? 16}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                x: parseInt(e.target.value, 10) || 0,
                                layoutPreset: "custom",
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[#666666] text-[11px] block mb-1">图片说明 (Caption)</span>
                        <input
                          type="text"
                          placeholder="下方说明文字..."
                          value={img.caption || ""}
                          onChange={(e) => onUpdateImage(img.id, { caption: e.target.value })}
                          className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white text-[11px] focus:outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Absolute Layer Controls */}
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 p-1.5 rounded flex items-center gap-1 font-medium">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>自由定位图层：脱离文本流，不触发障碍物绕排</span>
                      </div>

                      {/* Page and Z-Index */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">所属页面</span>
                          <select
                            value={img.pageIndex || 1}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                pageIndex: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] focus:outline-none"
                          >
                            {Array.from({ length: Math.max(pageCount, 2) }, (_, i) => i + 1).map((p) => (
                              <option key={p} value={p}>
                                第 {p} 页 {p === 1 ? "(首页/封面)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-[#666666] mb-1">
                            <span>层级 (Z-Index)</span>
                            <span className="font-mono text-black dark:text-white font-semibold">
                              {img.zIndex ?? 15}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[
                              { label: "底", val: 0, title: "底层背景" },
                              { label: "文字", val: 10, title: "正文同层" },
                              { label: "顶", val: 20, title: "置顶贴纸" },
                            ].map((z) => (
                              <button
                                key={z.val}
                                onClick={() => onUpdateImage(img.id, { zIndex: z.val })}
                                title={z.title}
                                className={`flex-1 py-0.5 text-[10px] rounded border ${
                                  (img.zIndex ?? 15) === z.val
                                    ? "bg-black dark:bg-white text-white dark:text-black border-transparent font-bold"
                                    : "border-[#d4d4d4] dark:border-[#262626] text-[#666666] dark:text-[#888888]"
                                }`}
                              >
                                {z.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rotation and Opacity */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="flex justify-between text-[#666666] mb-1">
                            <span className="flex items-center gap-0.5">
                              <RotateCw className="w-2.5 h-2.5" /> 旋转角度
                            </span>
                            <span className="font-mono text-black dark:text-white font-semibold">
                              {img.rotate ?? 0}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-45"
                            max="45"
                            step="1"
                            value={img.rotate ?? 0}
                            onChange={(e) =>
                              onUpdateImage(img.id, { rotate: parseInt(e.target.value, 10) })
                            }
                            className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded cursor-pointer mt-1"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[#666666] mb-1">
                            <span>不透明度</span>
                            <span className="font-mono text-black dark:text-white font-semibold">
                              {Math.round((img.opacity ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={img.opacity ?? 1}
                            onChange={(e) =>
                              onUpdateImage(img.id, { opacity: parseFloat(e.target.value) })
                            }
                            className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded cursor-pointer mt-1"
                          />
                        </div>
                      </div>

                      {/* Border Radius */}
                      <div className="text-[11px]">
                        <span className="text-[#666666] block mb-1">圆角半径 (px)</span>
                        <input
                          type="number"
                          min="0"
                          step="4"
                          value={img.borderRadius ?? 12}
                          onChange={(e) =>
                            onUpdateImage(img.id, {
                              borderRadius: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                        />
                      </div>

                      {/* Precise Size & Position */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">横向 X</span>
                          <input
                            type="number"
                            step="10"
                            value={img.x ?? 0}
                            onChange={(e) =>
                              onUpdateImage(img.id, { x: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[#666666] block mb-1">纵向 Y</span>
                          <input
                            type="number"
                            step="10"
                            value={img.y ?? 0}
                            onChange={(e) =>
                              onUpdateImage(img.id, { y: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#666666] block mb-1">宽度 (W)</span>
                          <input
                            type="number"
                            step="10"
                            value={img.width ?? 420}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                width: Math.max(20, parseInt(e.target.value, 10) || 20),
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[#666666] block mb-1">高度 (H)</span>
                          <input
                            type="number"
                            step="10"
                            value={img.height ?? 280}
                            onChange={(e) =>
                              onUpdateImage(img.id, {
                                height: Math.max(20, parseInt(e.target.value, 10) || 20),
                              })
                            }
                            className="w-full bg-white dark:bg-[#181818] border border-[#d4d4d4] dark:border-[#262626] rounded px-1.5 py-1 text-black dark:text-white text-[11px] font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Highlights Management */}
      {activeTab === "highlights" && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          <div className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
            在正文中出现的高亮词，将被算法自动匹配并渲染为品牌强调色。
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="新增高亮关键词..."
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddHighlightWord()}
              className="flex-1 bg-white dark:bg-[#0d0d0d] border border-[#d4d4d4] dark:border-[#222222] rounded-lg px-2.5 py-1.5 text-xs text-black dark:text-white placeholder-[#888888] dark:placeholder-[#555555] focus:outline-none focus:border-black dark:focus:border-[#444444]"
            />
            <button
              onClick={handleAddHighlightWord}
              className="px-3 py-1.5 bg-black dark:bg-[#1f1f1f] hover:bg-[#262626] text-white rounded-lg text-xs font-medium"
            >
              添加
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1">
            {highlightWords.map((word) => (
              <span
                key={word}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f0fdf4] dark:bg-[#161616] border border-[#bbf7d0] dark:border-[#262626] text-xs text-emerald-700 dark:text-emerald-400 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>{word}</span>
                <button
                  onClick={() => handleRemoveHighlightWord(word)}
                  className="hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
