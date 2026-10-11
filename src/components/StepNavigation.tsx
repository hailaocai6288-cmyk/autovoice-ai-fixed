import React from 'react';
import { Upload, Crosshair, FileText, Mic, Video, CheckCircle2 } from 'lucide-react';

export type StepNumber = 1 | 2 | 3 | 4 | 5;

interface StepNavigationProps {
  currentStep: StepNumber;
  completedSteps: Set<StepNumber>;
  onSelectStep: (step: StepNumber) => void;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  completedSteps,
  onSelectStep,
}) => {
  const steps = [
    {
      step: 1 as StepNumber,
      title: 'Bước 1: Nhập liệu',
      desc: 'Tải video Camtasia & Chủ đề',
      icon: Upload,
    },
    {
      step: 2 as StepNumber,
      title: 'Bước 2: Phân tích Chuột',
      desc: 'Dò tìm con trỏ & Thao tác',
      icon: Crosshair,
    },
    {
      step: 3 as StepNumber,
      title: 'Bước 3: Kịch bản AI',
      desc: 'Đạo diễn kịch bản Gemini',
      icon: FileText,
    },
    {
      step: 4 as StepNumber,
      title: 'Bước 4: Giọng đọc AI',
      desc: 'Tổng hợp giọng đọc tự nhiên',
      icon: Mic,
    },
    {
      step: 5 as StepNumber,
      title: 'Bước 5: Ghép & Xuất',
      desc: 'Đồng bộ & Tải video về',
      icon: Video,
    },
  ];

  return (
    <div className="w-full bg-zinc-900/90 border-b border-zinc-800 py-3 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
          {steps.map(({ step, title, desc, icon: Icon }) => {
            const isCurrent = currentStep === step;
            const isCompleted = completedSteps.has(step);
            const isAccessible = isCompleted || step === currentStep || completedSteps.has((step - 1) as StepNumber);

            return (
              <button
                key={step}
                disabled={!isAccessible}
                onClick={() => onSelectStep(step)}
                className={`relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-zinc-800/90 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : isCompleted
                    ? 'bg-zinc-900/60 border-zinc-700/80 hover:bg-zinc-800/60 cursor-pointer'
                    : 'bg-zinc-950/40 border-zinc-900/70 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500 text-black font-bold'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isCurrent
                          ? 'text-emerald-400'
                          : isCompleted
                          ? 'text-zinc-200'
                          : 'text-zinc-500'
                      }`}
                    >
                      {title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{desc}</p>
                </div>

                {isCurrent && (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 rounded-full hidden lg:block" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
