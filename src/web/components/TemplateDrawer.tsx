import React, { useEffect, useState } from "react";
import { Check, Trash2, X, Sparkles, Star } from "lucide-react";
import { TemplateSlot, TypesetConfig } from "../../core/types";

interface TemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  refreshKey: number;
  onApplyTemplate: (tpl: TypesetConfig) => void;
  adminKey: string;
}

interface SlotsResponse {
  ok: boolean;
  account: string;
  message?: string;
  error?: string;
  slots: {
    article_cover?: { id: string; template?: TypesetConfig };
    newspic_cover?: { id: string; template?: TypesetConfig };
    newspic_content?: { id: string; template?: TypesetConfig };
  };
}

export const TemplateDrawer: React.FC<TemplateDrawerProps> = ({
  isOpen,
  onClose,
  refreshKey,
  onApplyTemplate,
  adminKey,
}) => {
  const [templates, setTemplates] = useState<TypesetConfig[]>([]);
  const [slotsData, setSlotsData] = useState<SlotsResponse["slots"]>({});
  const [account, setAccount] = useState<string>("default");
  const [activeSlotFilter, setActiveSlotFilter] = useState<"all" | TemplateSlot>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async (acc = account) => {
    try {
      const res = await fetch(`/api/templates/slots?account=${encodeURIComponent(acc)}`, { headers: { "x-admin-key": adminKey } });
      const data: SlotsResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "获取槽位失败");
      if (data.ok && data.slots) {
        setSlotsData(data.slots);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "模板请求失败");
    }
  };

  const handleSetSlotDefault = async (slot: TemplateSlot, templateId: string) => {
    try {
      const res = await fetch("/api/templates/slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({ slot, templateId, account }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "设置默认模板失败");
      if (data.ok) {
        await fetchSlots(account);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "模板请求失败");
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        setError(data.message || "获取模板失败，请检查密钥");
      }
    } catch {
      setError("连接后端服务失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchSlots(account);
    }
  }, [isOpen, account, adminKey, refreshKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "删除模板失败");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      await fetchSlots(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模板请求失败");
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tpl) => {
    if (activeSlotFilter === "all") return true;
    return tpl.slot === activeSlotFilter;
  });

  return (
    <aside aria-label="模板库" className="absolute inset-y-0 right-0 z-40 w-80 max-w-full bg-white dark:bg-[#0f0f0f] border-l border-[#eaeaea] dark:border-[#262626] flex flex-col shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eaeaea] dark:border-[#222222]">
        <div className="flex items-center gap-2 font-semibold text-sm text-[#171717] dark:text-white">
          <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>模板库</span>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭模板库"
          className="text-[#888888] hover:text-black dark:hover:text-white p-1 rounded-md hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
        {error && (
          <div role="alert" className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>
        )}

        {/* Account and Slot Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[#666666] dark:text-[#888888]">
              <span>槽位账号:</span>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="bg-white dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-black dark:text-white focus:outline-none font-mono"
              >
                <option value="default">default (主账号)</option>
                <option value="ancientone">ancientone</option>
              </select>
            </div>
          </div>

          {/* Slot Category Tabs */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              onClick={() => setActiveSlotFilter("all")}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                activeSlotFilter === "all"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-[#666666] dark:text-[#888888] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c]"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setActiveSlotFilter("article_cover")}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                activeSlotFilter === "article_cover"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-[#666666] dark:text-[#888888] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c]"
              }`}
            >
              文章封面
            </button>
            <button
              onClick={() => setActiveSlotFilter("newspic_cover")}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                activeSlotFilter === "newspic_cover"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-[#666666] dark:text-[#888888] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c]"
              }`}
            >
              贴图封面
            </button>
            <button
              onClick={() => setActiveSlotFilter("newspic_content")}
              className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                activeSlotFilter === "newspic_content"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-[#666666] dark:text-[#888888] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c]"
              }`}
            >
              贴图内容
            </button>
          </div>
        </div>

        {/* Template List */}
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-[#888888] dark:text-[#555555]">正在加载模板...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#888888] dark:text-[#555555]">暂无匹配模板</div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isArticleCoverDefault = slotsData.article_cover?.id === tpl.id;
              const isNewspicCoverDefault = slotsData.newspic_cover?.id === tpl.id;
              const isNewspicContentDefault = slotsData.newspic_content?.id === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between p-3 rounded-lg bg-[#fafafa] dark:bg-[#141414] border border-[#eaeaea] dark:border-[#222222] hover:border-[#cccccc] dark:hover:border-[#333333] transition-all gap-2 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded border border-[#d4d4d4] dark:border-[#333333] shrink-0"
                      style={{ backgroundColor: tpl.theme.bgColor }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#171717] dark:text-white">{tpl.name}</span>
                        {tpl.slot && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                            {tpl.slot === "article_cover"
                              ? "文章封面"
                              : tpl.slot === "newspic_cover"
                              ? "贴图封面"
                              : "贴图内容"}
                          </span>
                        )}
                        {isArticleCoverDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500" /> 文章封面默认
                          </span>
                        )}
                        {isNewspicCoverDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500" /> 贴图封面默认
                          </span>
                        )}
                        {isNewspicContentDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-emerald-500" /> 贴图内容默认
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#888888] dark:text-[#666666] font-mono mt-0.5">
                        {tpl.aspectRatio} • 字号: {tpl.algorithm.baseFontSize}px
                        {tpl.images && tpl.images.length > 0 && ` • 配图: ${tpl.images.length}个`}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Set as slot default selector */}
                    {tpl.id && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSetSlotDefault(e.target.value as TemplateSlot, tpl.id!);
                          }
                        }}
                        className="text-[11px] bg-white dark:bg-[#1a1a1a] border border-[#d4d4d4] dark:border-[#333333] text-[#666666] dark:text-[#aaaaaa] rounded px-2 py-1 focus:outline-none"
                        title="为此账号设为某个槽位的默认模板"
                      >
                        <option value="">设为槽位默认...</option>
                        <option value="article_cover">设为「文章封面默认」</option>
                        <option value="newspic_cover">设为「贴图封面默认」</option>
                        <option value="newspic_content">设为「贴图内容默认」</option>
                      </select>
                    )}

                    <button
                      onClick={() => {
                        onApplyTemplate(tpl);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1f1f1f] hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-[#333333] dark:text-[#cccccc] hover:text-emerald-700 dark:hover:text-emerald-400 border border-[#d4d4d4] dark:border-[#2a2a2a] hover:border-emerald-500/40 rounded text-xs transition-all font-medium"
                    >
                      <Check className="w-3 h-3" />
                      <span>套用</span>
                    </button>

                    {tpl.id &&
                      !tpl.id.startsWith("tpl_wechat_") &&
                      !tpl.id.startsWith("tpl_longform_") &&
                      !tpl.id.startsWith("tpl_square_") &&
                      !tpl.id.startsWith("tpl_wide_") && (
                        <button
                          onClick={() => handleDelete(tpl.id!)}
                          className="p-1 text-[#888888] dark:text-[#555555] hover:text-red-500 rounded hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f]"
                          title="删除自定义模板"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
