import React from 'react';
import { Video, Sparkles, Wand2, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  hasActiveProject?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasActiveProject }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                AutoVoice Studio
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  AI Camtasia Sync
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Hệ thống tự động phân tích chuột Camtasia &amp; lồng tiếng video bằng Gemini AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Gemini 3.8 Flash + TTS
          </div>

          {hasActiveProject && onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              title="Làm mới dự án"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dự án mới</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
