import React, { useState, useRef } from 'react';
import { Mic, Play, Pause, RefreshCw, Volume2, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Waves, Gauge, Globe } from 'lucide-react';
import { FullScript, ScriptLanguage, ScriptSegment, VoiceSettings } from '../types';
import { generateSegmentVoiceover } from '../utils/audioSynthesizer';

interface Step4VoiceProps {
  script: FullScript;
  onScriptUpdated: (updatedScript: FullScript) => void;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
  onProceedToStep5: () => void;
}

export const Step4Voice: React.FC<Step4VoiceProps> = ({
  script,
  onScriptUpdated,
  voiceSettings,
  onVoiceSettingsChange,
  onProceedToStep5,
}) => {
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState('');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const isEnglish = voiceSettings.language === 'en';

  const geminiVoicesVi = [
    { id: 'Kore', name: 'Kore (Nữ - Chắc, rõ ràng)', desc: 'Phù hợp video hướng dẫn & giới thiệu' },
    { id: 'Sulafat', name: 'Sulafat (Nữ - Ấm áp, truyền cảm)', desc: 'Phù hợp nội dung cần gần gũi' },
    { id: 'Zephyr', name: 'Zephyr (Nữ - Sáng, tươi tắn)', desc: 'Phù hợp video công nghệ & giáo dục' },
    { id: 'Leda', name: 'Leda (Nữ - Trẻ trung)', desc: 'Phù hợp video review, nhịp nhanh' },
    { id: 'Puck', name: 'Puck (Nam - Tươi vui, năng động)', desc: 'Phù hợp video review & quảng bá nhanh' },
    { id: 'Charon', name: 'Charon (Nam - Trầm, giảng giải)', desc: 'Phù hợp video doanh nghiệp & hội thảo' },
    { id: 'Achird', name: 'Achird (Nam - Thân thiện)', desc: 'Phù hợp hướng dẫn thân tình' },
    { id: 'Orus', name: 'Orus (Nam - Vững vàng)', desc: 'Phù hợp video kỹ thuật chuyên sâu' },
    { id: 'Fenrir', name: 'Fenrir (Nam - Hào hứng)', desc: 'Phù hợp nội dung năng lượng cao' },
  ];

  const geminiVoicesEn = [
    { id: 'Kore', name: 'Kore (Female - Firm, clear)', desc: 'Ideal for product demos & tutorials' },
    { id: 'Zephyr', name: 'Zephyr (Female - Bright, engaging)', desc: 'Great for tech walkthroughs & education' },
    { id: 'Sulafat', name: 'Sulafat (Female - Warm)', desc: 'Friendly, approachable tutorials' },
    { id: 'Puck', name: 'Puck (Male - Upbeat & energetic)', desc: 'Great for fast-paced feature highlights' },
    { id: 'Charon', name: 'Charon (Male - Informative, deep)', desc: 'Ideal for corporate & formal overviews' },
    { id: 'Achird', name: 'Achird (Male - Friendly)', desc: 'Casual, warm walkthroughs' },
    { id: 'Fenrir', name: 'Fenrir (Male - Excitable)', desc: 'Energetic launches & highlights' },
  ];

  const geminiVoices = isEnglish ? geminiVoicesEn : geminiVoicesVi;

  const handlePlayAudio = (seg: ScriptSegment) => {
    if (!seg.audioUrl) return;

    if (currentlyPlayingId === seg.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setCurrentlyPlayingId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(seg.audioUrl);
    audioPlayerRef.current = audio;
    setCurrentlyPlayingId(seg.id);

    audio.onended = () => {
      setCurrentlyPlayingId(null);
    };

    audio.play();
  };

  const handleGenerateSingleAudio = async (segId: string) => {
    const seg = script.segments.find((s) => s.id === segId);
    if (!seg) return;

    const updatedSegments = script.segments.map((s) =>
      s.id === segId ? { ...s, isGeneratingAudio: true } : s
    );
    onScriptUpdated({ ...script, segments: updatedSegments });

    setTtsError('');
    try {
      const res = await generateSegmentVoiceover(
        seg.voiceoverText,
        voiceSettings,
        seg.endTime - seg.startTime
      );

      const finalized = script.segments.map((s) =>
        s.id === segId
          ? {
              ...s,
              isGeneratingAudio: false,
              audioUrl: res.audioUrl,
              audioBlob: res.audioBlob,
              audioDuration: res.duration,
            }
          : s
      );
      onScriptUpdated({ ...script, segments: finalized });
    } catch (e: any) {
      console.error(e);
      setTtsError(`Đoạn ${script.segments.findIndex((s) => s.id === segId) + 1}: ${e?.message || 'Không tạo được giọng'}`);
      const reverted = script.segments.map((s) =>
        s.id === segId ? { ...s, isGeneratingAudio: false } : s
      );
      onScriptUpdated({ ...script, segments: reverted });
    }
  };

  const handleGenerateAllAudio = async () => {
    setIsBatchGenerating(true);
    setBatchProgress(0);
    setTtsError('');

    const segments = [...script.segments];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      setBatchProgress(Math.round(((i + 1) / segments.length) * 100));

      try {
        const res = await generateSegmentVoiceover(
          seg.voiceoverText,
          voiceSettings,
          seg.endTime - seg.startTime
        );

        segments[i] = {
          ...seg,
          audioUrl: res.audioUrl,
          audioBlob: res.audioBlob,
          audioDuration: res.duration,
        };

        // Update state progressively so user sees items finish
        onScriptUpdated({ ...script, segments: [...segments] });
      } catch (err: any) {
        console.warn('TTS item error:', err);
        setTtsError(`Đoạn ${i + 1} chưa tạo được: ${err?.message || 'lỗi không xác định'}. Bấm biểu tượng tạo lại ở đoạn đó.`);
      }
    }

    setIsBatchGenerating(false);
  };

  const readyAudioCount = script.segments.filter((s) => Boolean(s.audioBlob)).length;
  const allAudioReady = readyAudioCount === script.segments.length && readyAudioCount > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
                <Mic className="w-3.5 h-3.5" />
                Bước 4: Tổng Hợp Giọng Đọc Tự Nhiên (AI Voice TTS)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold">
                <Globe className="w-3 h-3 text-violet-400" />
                {isEnglish ? '🇺🇸 Giọng Tiếng Anh (English)' : '🇻🇳 Giọng Tiếng Việt'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Chuyển Kịch Bản Thành Giọng Thuyết Minh Sống Động
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Hệ thống sử dụng mô hình Gemini 3.8 Flash-Lite TTS kết hợp bộ tổng hợp giọng đọc {isEnglish ? 'Tiếng Anh' : 'Tiếng Việt'} chuẩn xác,
              tự động cân đối tốc độ nói để khớp với thời gian con trỏ chuột thao tác trên màn hình.
            </p>
          </div>

          <button
            onClick={handleGenerateAllAudio}
            disabled={isBatchGenerating}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition cursor-pointer shadow-lg shadow-violet-600/20 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            {isBatchGenerating
              ? `Đang tổng hợp (${batchProgress}%)...`
              : 'Tạo Toàn Bộ Giọng Đọc (Batch Generate)'}
          </button>
        </div>
      </div>

      {/* Voice Settings Panel */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-violet-400" />
            Cấu Hình Công Nghệ Giọng Đọc &amp; Âm Sắc
          </h3>

          {/* Quick Language Toggle */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => onVoiceSettingsChange({ ...voiceSettings, language: 'vi' })}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                !isEnglish ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => onVoiceSettingsChange({ ...voiceSettings, language: 'en' })}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                isEnglish ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Engine Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Công nghệ phát âm</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onVoiceSettingsChange({ ...voiceSettings, engine: 'gemini' })}
                className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                  voiceSettings.engine === 'gemini'
                    ? 'bg-violet-500/10 border-violet-500 text-violet-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-zinc-200">Gemini Neural TTS</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Mô hình AI cao cấp</div>
              </button>

              <button
                type="button"
                onClick={() => onVoiceSettingsChange({ ...voiceSettings, engine: 'browser' })}
                className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                  voiceSettings.engine === 'browser'
                    ? 'bg-violet-500/10 border-violet-500 text-violet-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-zinc-200">
                  {isEnglish ? 'Browser Speech (EN)' : 'Giọng Tiếng Việt Gốc'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Phát âm chuẩn hệ thống</div>
              </button>
            </div>
          </div>

          {/* Voice Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Nhân vật giọng đọc</label>
            <select
              value={voiceSettings.geminiVoice}
              onChange={(e) =>
                onVoiceSettingsChange({
                  ...voiceSettings,
                  geminiVoice: e.target.value as any,
                })
              }
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
            >
              {geminiVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500">
              {geminiVoices.find((v) => v.id === voiceSettings.geminiVoice)?.desc}
            </p>
          </div>

          {/* Speech Rate Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-violet-400" /> Tốc độ nói:
              </span>
              <span className="font-mono text-violet-400 font-bold">{voiceSettings.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={voiceSettings.speechRate}
              onChange={(e) =>
                onVoiceSettingsChange({
                  ...voiceSettings,
                  speechRate: parseFloat(e.target.value),
                })
              }
              className="w-full accent-violet-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0.8x (Chậm, rõ)</span>
              <span>1.0x (Chuẩn)</span>
              <span>1.3x (Nhanh)</span>
            </div>
          </div>
        </div>
      </div>

      {ttsError && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 text-rose-300 text-sm">{ttsError}</div>
      )}

      {voiceSettings.engine === 'browser' && (
        <div className="bg-amber-950/40 border border-amber-800 rounded-2xl p-4 text-amber-300 text-xs">
          Giọng trình duyệt chỉ để nghe thử, trình duyệt không cho ghi vào video nên video xuất ra sẽ KHÔNG có tiếng.
          Hãy chọn <b>Gemini Neural TTS</b> để xuất video có lồng tiếng.
        </div>
      )}

      {/* Segments Audio Generation List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-200">
              Danh Sách Đoạn Thu Âm Thuyết Minh ({isEnglish ? 'English' : 'Tiếng Việt'})
            </h4>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {readyAudioCount} / {script.segments.length} đoạn đã sẵn sàng
            </span>
          </div>

          {!allAudioReady && (
            <button
              onClick={handleGenerateAllAudio}
              disabled={isBatchGenerating}
              className="text-xs text-violet-400 hover:text-violet-300 underline cursor-pointer"
            >
              Tạo tự động cho toàn bộ phân đoạn
            </button>
          )}
        </div>

        <div className="space-y-3">
          {script.segments.map((seg, idx) => {
            const hasAudio = Boolean(seg.audioBlob && seg.audioUrl);
            const isPlaying = currentlyPlayingId === seg.id;
            const targetDuration = seg.endTime - seg.startTime;

            return (
              <div
                key={seg.id}
                className={`bg-zinc-900/90 border rounded-2xl p-4 sm:p-5 transition-all ${
                  hasAudio
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-800/60 opacity-90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info & Text */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 font-bold">
                        {seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s ({targetDuration.toFixed(1)}s)
                      </span>
                      <span className="text-xs text-zinc-400 truncate">
                        • {seg.action}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-100 font-medium leading-relaxed pl-8">
                      "{seg.voiceoverText}"
                    </p>
                  </div>

                  {/* Right: Audio Player & Action */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                    {hasAudio ? (
                      <div className="flex items-center gap-2">
                        {/* Audio Waveform icon & length */}
                        <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                          <Waves className={`w-3.5 h-3.5 ${isPlaying ? 'text-violet-400 animate-pulse' : 'text-zinc-500'}`} />
                          <span className="font-mono text-zinc-300">
                            {seg.audioDuration ? `${seg.audioDuration.toFixed(1)}s` : `${targetDuration.toFixed(1)}s`}
                          </span>
                        </div>

                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(seg)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                            isPlaying
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                          title={isPlaying ? 'Dừng phát' : 'Nghe thử giọng đọc'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        {/* Re-generate audio */}
                        <button
                          type="button"
                          onClick={() => handleGenerateSingleAudio(seg.id)}
                          disabled={seg.isGeneratingAudio}
                          className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg transition cursor-pointer"
                          title="Tạo lại âm thanh đoạn này"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${seg.isGeneratingAudio ? 'animate-spin text-violet-400' : ''}`} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerateSingleAudio(seg.id)}
                        disabled={seg.isGeneratingAudio}
                        className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <Mic className={`w-3.5 h-3.5 ${seg.isGeneratingAudio ? 'animate-spin' : ''}`} />
                        {seg.isGeneratingAudio ? 'Đang tạo...' : 'Tạo giọng đọc'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Proceed Action */}
      <div className="pt-4 flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {allAudioReady ? (
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Toàn bộ các phân đoạn đã có âm thanh giọng đọc hoàn chỉnh
            </span>
          ) : (
            <span>Bạn có thể bấm "Tạo Toàn Bộ Giọng Đọc" để sẵn sàng cho bước ghép nối video</span>
          )}
        </div>

        <button
          type="button"
          onClick={onProceedToStep5}
          disabled={readyAudioCount === 0}
          className="py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <span>Chuyển sang Bước 5: Ghép Nối &amp; Xuất Bản Video</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
