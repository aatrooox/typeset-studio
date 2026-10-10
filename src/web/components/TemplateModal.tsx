import React, { useEffect, useState } from "react";
import { Check, FolderPlus, Trash2, X, Sparkles } from "lucide-react";
import { TypesetConfig } from "../../core/types";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TypesetConfig;
  onApplyTemplate: (tpl: TypesetConfig) => void;
  adminKey: string;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyTemplate,
  adminKey,
}) => {
  const [templates, setTemplates] = useState<TypesetConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setTemplateName(currentConfig.name ? `${currentConfig.name} 副本` : "我的自定义模板");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setIsSaving(true);
    try {
      const tplToSave: TypesetConfig = {
        ...currentConfig,
        id: undefined, // auto generate
        name: templateName.trim(),
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
        fetchTemplates();
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
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-[#262626] rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222222]">
          <div className="flex items-center gap-2 font-semibold text-sm text-white">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>排版模板中心</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-white p-1 rounded-md hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Save current config as template */}
          <div className="bg-[#141414] border border-[#222222] rounded-lg p-3 flex flex-col gap-2">
            <span className="text-xs text-[#888888] font-medium">将当前参数另存为模板</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="模板名称..."
                className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444]"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-[#eaeaea] text-xs font-semibold rounded transition-all btn-vercel disabled:opacity-50"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{isSaving ? "保存中..." : "保存模板"}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Template List */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[#666666] font-mono">已保存模板列表</span>
            {isLoading ? (
              <div className="text-center py-8 text-xs text-[#555555]">正在加载模板...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#555555]">暂无模板</div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222] hover:border-[#333333] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded border border-[#333333]"
                      style={{ backgroundColor: tpl.theme.bgColor }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{tpl.name}</div>
                      <div className="text-[10px] text-[#666666] font-mono mt-0.5">
                        {tpl.aspectRatio} • 字号: {tpl.algorithm.baseFontSize}px • 避让:{" "}
                        {tpl.algorithm.obstacleGap}px
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onApplyTemplate(tpl);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#1f1f1f] hover:bg-emerald-500/20 text-[#cccccc] hover:text-emerald-400 border border-[#2a2a2a] hover:border-emerald-500/30 rounded text-xs transition-all"
                    >
                      <Check className="w-3 h-3" />
                      <span>套用</span>
                    </button>

                    {tpl.id && (
                      <button
                        onClick={() => handleDelete(tpl.id!)}
                        className="p-1 text-[#555555] hover:text-red-400 rounded hover:bg-[#1f1f1f]"
                        title="删除模板"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
