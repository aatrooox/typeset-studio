import React, { useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import { validateTemplateAssets } from "../../core/template";
import { TemplateSlot, TypesetConfig } from "../../core/types";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TypesetConfig;
  onSaved: (template: TypesetConfig) => void;
  adminKey: string;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen, onClose, currentConfig, onSaved, adminKey,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [templateName, setTemplateName] = useState("");
  const [saveSlot, setSaveSlot] = useState<TemplateSlot | "none">("none");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTemplateName(currentConfig.name || "我的自定义模板");
      setSaveSlot(currentConfig.slot || (currentConfig.aspectRatio === "wechat-cover-2.35" ? "article_cover" : "newspic_content"));
      setError(null);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  // 始终另存为新模板，保留当前图片与排版，不覆盖来源模板。
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!templateName.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      validateTemplateAssets(currentConfig.images);
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({
          ...currentConfig,
          id: undefined,
          name: templateName.trim(),
          slot: saveSlot === "none" ? undefined : saveSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "保存模板失败");
      onSaved(data.template);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存模板请求异常");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="save-template-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm p-0 rounded-xl border border-[#eaeaea] dark:border-[#262626] bg-white dark:bg-[#0f0f0f] text-[#171717] dark:text-white shadow-2xl backdrop:bg-black/40"
    >
      <form onSubmit={handleSave}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eaeaea] dark:border-[#222222]">
          <h2 id="save-template-title" className="text-sm font-semibold">保存模板</h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="关闭保存模板" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-xs">
            模板名称
            <input autoFocus required value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="输入模板名称" className="bg-transparent border border-[#d4d4d4] dark:border-[#333333] rounded px-3 py-2 focus:outline-none focus:border-emerald-500" />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            保存到槽位
            <select value={saveSlot} onChange={(event) => setSaveSlot(event.target.value as TemplateSlot | "none")} className="bg-white dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#333333] rounded px-3 py-2">
              <option value="article_cover">文章封面 (2.35:1)</option>
              <option value="newspic_cover">贴图封面 (3:4)</option>
              <option value="newspic_content">贴图内容 (3:4)</option>
              <option value="none">通用模板</option>
            </select>
          </label>
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={isSaving || !templateName.trim()} className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-xs font-semibold disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "保存中..." : "保存模板"}
          </button>
        </div>
      </form>
    </dialog>
  );
};
