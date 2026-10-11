import React, { useEffect, useState } from "react";
import { Check, FolderPlus, Trash2, X, Sparkles, Star, Tag, ChevronDown } from "lucide-react";
import { TemplateSlot, TypesetConfig } from "../../core/types";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TypesetConfig;
  onApplyTemplate: (tpl: TypesetConfig) => void;
  adminKey: string;
}

interface SlotsResponse {
  ok: boolean;
  account: string;
  slots: {
    article_cover?: { id: string; template?: TypesetConfig };
    newspic_cover?: { id: string; template?: TypesetConfig };
    newspic_content?: { id: string; template?: TypesetConfig };
  };
}

const SLOT_LABELS: Record<TemplateSlot, string> = {
  article_cover: "文章封面 (2.35:1)",
  newspic_cover: "贴图封面 (3:4)",
  newspic_content: "贴图内容 (3:4)",
};

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyTemplate,
  adminKey,
}) => {
  const [templates, setTemplates] = useState<TypesetConfig[]>([]);
  const [slotsData, setSlotsData] = useState<SlotsResponse["slots"]>({});
  const [account, setAccount] = useState<string>("default");
  const [activeSlotFilter, setActiveSlotFilter] = useState<"all" | TemplateSlot>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [saveSlot, setSaveSlot] = useState<TemplateSlot | "none">(() => {
    return currentConfig.aspectRatio === "wechat-cover-2.35" ? "article_cover" : "newspic_content";
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async (acc = account) => {
    try {
      const res = await fetch(`/api/templates/slots?account=${encodeURIComponent(acc)}`);
      const data: SlotsResponse = await res.json();
      if (data.ok && data.slots) {
        setSlotsData(data.slots);
      }
    } catch {
      // ignore
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
      if (data.ok) {
        await fetchSlots(account);
      }
    } catch {
      // ignore
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
      if (data.ok && Array.isArray(data.templates)) {
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
      setTemplateName(currentConfig.name ? `${currentConfig.name} 副本` : "我的自定义模板");
      setSaveSlot(currentConfig.aspectRatio === "wechat-cover-2.35" ? "article_cover" : "newspic_content");
    }
  }, [isOpen, account]);

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setIsSaving(true);
    try {
      const tplToSave: TypesetConfig = {
        ...currentConfig,
        id: undefined, // auto generate
        name: templateName.trim(),
        slot: saveSlot !== "none" ? saveSlot : undefined,
        images: currentConfig.images ? [...currentConfig.images] : undefined,
      };

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify(tplToSave),
      });

      const data = await res.json();
      if (data.ok) {
        await fetchTemplates();
        await fetchSlots(account);
      } else {
        setError(data.message || "保存模板失败");
      }
    } catch {
      setError("保存模板请求异常");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      await fetchSlots(account);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tpl) => {
    if (activeSlotFilter === "all") return true;
    return tpl.slot === activeSlotFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f0f0f] border border-[#eaeaea] dark:border-[#262626] rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eaeaea] dark:border-[#222222]">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#171717] dark:text-white">
            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>排版模板中心</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-black dark:hover:text-white p-1 rounded-md hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Save current config as template */}
          <div className="bg-[#f9f9f9] dark:bg-[#141414] border border-[#eaeaea] dark:border-[#222222] rounded-lg p-3 flex flex-col gap-2.5">
            <span className="text-xs text-[#666666] dark:text-[#888888] font-medium">将当前参数另存为模板</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="模板名称..."
                className="flex-1 bg-white dark:bg-[#0a0a0a] border border-[#d4d4d4] dark:border-[#2a2a2a] rounded px-3 py-1.5 text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-[#444444]"
              />
              <select
                value={saveSlot}
                onChange={(e) => setSaveSlot(e.target.value as any)}
                className="bg-white dark:bg-[#0a0a0a] border border-[#d4d4d4] dark:border-[#2a2a2a] rounded px-2 py-1.5 text-xs text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-[#444444]"
              >
                <option value="article_cover">槽位: 文章封面 (2.35:1)</option>
                <option value="newspic_cover">槽位: 贴图封面 (3:4)</option>
                <option value="newspic_content">槽位: 贴图内容 (3:4)</option>
                <option value="none">槽位: 通用模板</option>
              </select>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-[#262626] dark:bg-white dark:text-black dark:hover:bg-[#eaeaea] text-xs font-semibold rounded transition-all btn-vercel disabled:opacity-50 shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{isSaving ? "保存中..." : "保存模板"}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Account and Slot Filters */}
          <div className="flex flex-col gap-2 pt-1 border-t border-[#eaeaea] dark:border-[#222222]">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-[#666666] dark:text-[#888888]">
                <span>默认槽位配置账号:</span>
                <select
                  value={account}
                  onChange={(e) => {
                    const acc = e.target.value;
                    setAccount(acc);
                    fetchSlots(acc);
                  }}
                  className="bg-white dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#2a2a2a] rounded px-2 py-0.5 text-xs text-black dark:text-white focus:outline-none font-mono"
                >
                  <option value="default">default (主账号)</option>
                  <option value="ancientone">ancientone</option>
                </select>
              </div>
            </div>

            {/* Slot Category Tabs */}
            <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#fafafa] dark:bg-[#141414] border border-[#eaeaea] dark:border-[#222222] hover:border-[#cccccc] dark:hover:border-[#333333] transition-all gap-2 group"
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

                    <div className="flex items-center gap-2 self-end sm:self-auto">
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
                          onClose();
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
      </div>
    </div>
  );
};
