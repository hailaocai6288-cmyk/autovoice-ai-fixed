import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, RefreshCw, Plus, Trash2, ArrowRight, Clock, MessageSquare, Edit3, Check, MousePointer2, Globe } from 'lucide-react';
import { DetectedMoment, FullScript, ScriptLanguage, ScriptSegment, VideoSourceData } from '../types';

interface Step3ScriptProps {
  videoData: VideoSourceData;
  language: ScriptLanguage;
  topic: string;
  tone: string;
  targetAudience: string;
  voiceGender: string;
  detectedMoments: DetectedMoment[];
  script: FullScript | null;
  onScriptGenerated: (script: FullScript) => void;
  onProceedToStep4: () => void;
}

export const Step3Script: React.FC<Step3ScriptProps> = ({
  videoData,
  language,
  topic,
  tone,
  targetAudience,
  voiceGender,
  detectedMoments,
  script,
  onScriptGenerated,
  onProceedToStep4,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // Generate script automatically if not yet created
  useEffect(() => {
    if (!script && !isGenerating && detectedMoments.length > 0) {
      generateScriptWithGemini();
    }
  }, [detectedMoments.length, language]);

  const generateScriptWithGemini = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage('');

      // Pick 10-12 representative keyframes distributed across the ENTIRE duration
      const momentsWithThumbs = detectedMoments.filter((m) => Boolean(m.frameThumbnail));
      const targetCount = Math.min(12, momentsWithThumbs.length);
      const selectedMoments: DetectedMoment[] = [];

      if (momentsWithThumbs.length <= targetCount) {
        selectedMoments.push(...momentsWithThumbs);
      } else {
        const step = (momentsWithThumbs.length - 1) / (targetCount - 1);
        for (let i = 0; i < targetCount; i++) {
          const idx = Math.min(momentsWithThumbs.length - 1, Math.round(i * step));
          selectedMoments.push(momentsWithThumbs[idx]);
        }
      }

      const sampleFrames = selectedMoments.map((m) => ({
        timestamp: m.timestamp,
        imageBase64: m.frameThumbnail,
        actionLabel: m.actionLabel,
      }));

      const res = await fetch('/api/analyze-and-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          duration: videoData.duration,
          language,
          tone,
          voiceGender,
          targetAudience,
          detectedMoments: detectedMoments.map((m) => ({
            timestamp: m.timestamp,
            action: m.actionLabel,
            actionType: m.actionType,
            cursorX: m.cursorX,
            cursorY: m.cursorY,
          })),
          sampleFrames,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi khi gọi máy chủ Gemini AI');
      }

      const data: FullScript = await res.json();
      data.language = language;
      onScriptGenerated(data);
      if (data.segments && data.segments.length > 0) {
        setActiveSegmentId(data.segments[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Không thể tạo kịch bản từ Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSegmentText = (id: string, newText: string) => {
    if (!script) return;
    const updatedSegments = script.segments.map((seg) => {
      if (seg.id === id) {
        return { ...seg, voiceoverText: newText };
      }
      return seg;
    });
    onScriptGenerated({ ...script, segments: updatedSegments });
  };

  const handleUpdateSegmentAction = (id: string, newAction: string) => {
    if (!script) return;
    const updatedSegments = script.segments.map((seg) => {
      if (seg.id === id) {
        return { ...seg, action: newAction };
      }
      return seg;
    });
    onScriptGenerated({ ...script, segments: updatedSegments });
  };

  const handleDeleteSegment = (id: string) => {
    if (!script || script.segments.length <= 1) return;
    const updatedSegments = script.segments.filter((seg) => seg.id !== id);
    onScriptGenerated({ ...script, segments: updatedSegments });
  };

  const handleAddSegment = () => {
    if (!script) return;
    const lastSeg = script.segments[script.segments.length - 1];
    const newStartTime = lastSeg ? Number((lastSeg.endTime + 0.1).toFixed(1)) : 0;
    const newEndTime = Number((newStartTime + 3.0).toFixed(1));
    const newSeg: ScriptSegment = {
      id: `seg-${Date.now()}`,
      startTime: newStartTime,
      endTime: Math.min(videoData.duration, newEndTime),
      action: language === 'en' ? 'Additional screen action' : 'Thao tác bổ sung trên màn hình',
      cursorPosition: { x: 50, y: 50 },
      voiceoverText:
        language === 'en'
          ? 'Next, let us move to the following step on the screen...'
          : 'Tiếp theo, các bạn tiến hành bước tiếp theo...',
      emotion: language === 'en' ? 'Natural, instructive' : 'Tự nhiên, rành mạch',
      calloutText: language === 'en' ? 'Next Step' : 'Bước bổ sung',
    };
    onScriptGenerated({ ...script, segments: [...script.segments, newSeg] });
    setActiveSegmentId(newSeg.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Bước 3: Đạo Diễn Kịch Bản Thông Minh (AI Scriptwriting)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold">
                <Globe className="w-3 h-3 text-emerald-400" />
                {language === 'en' ? '🇺🇸 Tiếng Anh (English)' : '🇻🇳 Tiếng Việt'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Kịch Bản Lồng Tiếng Khớp Từng Giây Chuột Camtasia
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Gemini 3.8 Flash đóng vai trò đạo diễn, phân tích từng cú nhấp chuột và chuyển động trên màn hình
              để viết lời thoại {language === 'en' ? 'bằng Tiếng Anh' : 'bằng Tiếng Việt'} mượt mà, canh chuẩn thời gian phát âm theo nhịp điệu thao tác.
            </p>
          </div>

          <button
            onClick={generateScriptWithGemini}
            disabled={isGenerating}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Gemini đang viết kịch bản...' : 'Tạo lại kịch bản AI'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Đang gửi dữ liệu thao tác chuột đến Gemini ({language === 'en' ? 'Kịch bản Tiếng Anh' : 'Kịch bản Tiếng Việt'})...
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Mô hình đang phân tích các tọa độ nhấp chuột, tính toán số từ khớp với thời lượng từng giây...
          </p>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 text-rose-300 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={generateScriptWithGemini}
            className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-100 text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Script Review & Editor */}
      {script && !isGenerating && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">
                  Tiêu đề &amp; Định hướng nội dung
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {language === 'en' ? 'English Narration' : 'Thuyết minh Tiếng Việt'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{script.title || topic}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{script.summary}</p>
            </div>

            <div className="flex items-center gap-4 bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 text-xs shrink-0">
              <div>
                <span className="text-zinc-500 block">Số phân đoạn</span>
                <span className="font-bold text-zinc-200">{script.segments.length} đoạn</span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div>
                <span className="text-zinc-500 block">Tốc độ thoại</span>
                <span className="font-bold text-emerald-400">{script.estimatedSpeed || '1.0x chuẩn'}</span>
              </div>
            </div>
          </div>

          {/* Segments Storyboard List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Bảng Kịch Bản Thuyết Minh Chi Tiết (Có Thể Chỉnh Sửa Trực Tiếp)
              </h4>

              <button
                type="button"
                onClick={handleAddSegment}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm phân đoạn
              </button>
            </div>

            <div className="space-y-3">
              {script.segments.map((seg, idx) => {
                const isActive = activeSegmentId === seg.id;
                const duration = Math.max(0.5, seg.endTime - seg.startTime);
                const wordCount = seg.voiceoverText.trim().split(/\s+/).length;
                const wordsPerSec = (wordCount / duration).toFixed(1);

                return (
                  <div
                    key={seg.id}
                    onClick={() => setActiveSegmentId(seg.id)}
                    className={`bg-zinc-900/90 border rounded-2xl p-4 sm:p-5 transition-all ${
                      isActive
                        ? 'border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700">
                          {idx + 1}
                        </span>

                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="bg-zinc-950 px-2.5 py-1 rounded-md text-emerald-400 border border-zinc-800 flex items-center gap-1.5 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            {seg.startTime.toFixed(1)}s → {seg.endTime.toFixed(1)}s
                          </span>
                          <span className="text-zinc-500">({duration.toFixed(1)}s)</span>
                        </div>

                        {seg.cursorPosition && (
                          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            <MousePointer2 className="w-3 h-3 text-amber-400" />
                            X:{seg.cursorPosition.x}% Y:{seg.cursorPosition.y}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400 text-[11px] bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700">
                          {seg.emotion || 'Rõ ràng'}
                        </span>

                        {seg.calloutText && (
                          <span className="text-sky-400 text-[11px] bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30 font-semibold">
                            🏷 {seg.calloutText}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSegment(seg.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 transition ml-1"
                          title="Xóa phân đoạn này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3">
                      {/* Action description note (4 cols) */}
                      <div className="md:col-span-4 space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          Thao tác chuột / Màn hình:
                        </label>
                        <input
                          type="text"
                          value={seg.action}
                          onChange={(e) => handleUpdateSegmentAction(seg.id, e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Voiceover dialogue text (8 cols) */}
                      <div className="md:col-span-8 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                            Lời thoại thuyết minh ({language === 'en' ? 'English' : 'Tiếng Việt'}):
                          </label>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {wordCount} từ (~{wordsPerSec} từ/giây)
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={seg.voiceoverText}
                          onChange={(e) => handleUpdateSegmentText(seg.id, e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Proceed Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onProceedToStep4}
              className="py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
            >
              <span>Chuyển sang Bước 4: Tổng Hợp Giọng Đọc AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
