import React, { useState } from "react";
import { Check, Key, ShieldCheck, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
  isVerified: boolean | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
  isVerified,
}) => {
  const [inputKey, setInputKey] = useState(currentKey);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputKey.trim());
    setStatusMessage("密钥已更新并保存至本地存储");
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f0f0f] border border-[#eaeaea] dark:border-[#262626] rounded-xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#eaeaea] dark:border-[#222222]">
          <div className="flex items-center gap-2 font-semibold text-sm text-[#171717] dark:text-white">
            <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>超管密钥授权</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-black dark:hover:text-white p-1 rounded-md hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <div className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
            服务端默认通过 <code className="text-black dark:text-[#ededed] font-mono font-semibold">TYPESET_ADMIN_KEY</code> 保护模板持久化、图片上传和无头出图 API。请填入服务启动时控制台打印的管理员密钥。
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-[#888888] dark:text-[#666666]">X-Admin-Key</label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="tsk_..."
              className="bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#d4d4d4] dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-[#444444]"
            />
          </div>

          {statusMessage ? (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </div>
          ) : isVerified ? (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>密钥已通过验证，拥有超管权限</span>
            </div>
          ) : (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 rounded-lg">
              当前密钥未验证或已失效，请检查后端 .env 配置
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#eaeaea] dark:border-[#262626] text-xs text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#161616]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-black text-white hover:bg-[#262626] dark:bg-white dark:text-black dark:hover:bg-[#eaeaea] text-xs font-semibold rounded-lg transition-all btn-vercel"
            >
              保存并授权
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
