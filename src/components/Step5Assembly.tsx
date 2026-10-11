import React, { useState, useRef, useEffect } from 'react';
import { Video, Download, Play, Pause, RotateCcw, Sparkles, CheckCircle2, FileText, Music, Layers, Volume2, Eye, ShieldCheck, Headphones, Check } from 'lucide-react';
import { ExportProgress, FullScript, VideoSourceData, VoiceSettings } from '../types';
import { exportCompositeVideo, generateSrtContent } from '../utils/videoExporter';

interface Step5AssemblyProps {
  videoData: VideoSourceData;
  script: FullScript;
  voiceSettings?: VoiceSettings;
  onBackToScript: () => void;
}

export const Step5Assembly: React.FC<Step5AssemblyProps> = ({
  videoData,
  script,
  voiceSettings,
  onBackToScript,
}) => {
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeCursorEffects, setIncludeCursorEffects] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Default download format set to 'mp3' per user request: "Video tải về có đuôi .mp3 và có cả tiếng lẫn hình"
  const [defaultFormat, setDefaultFormat] = useState<'mp3' | 'mp4'>('mp3');

  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    currentPhase: '',
    exportedBlobUrl: null,
    exportedAudioUrl: null,
    exportedMimeType: 'video/mp4',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastTriggeredSegmentId = useRef<string | null>(null);

  // Synchronized playback logic for preview player
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // If exported blob is already loaded in video element, it plays its own mixed audio track!
    if (exportProgress.exportedBlobUrl) {
      return;
    }

    // For unrendered preview, trigger individual voiceover audio segments
    const activeSeg = script.segments.find(
      (s) => t >= s.startTime && t <= s.endTime
    );

    if (activeSeg && activeSeg.audioUrl && activeSeg.id !== lastTriggeredSegmentId.current) {
      lastTriggeredSegmentId.current = activeSeg.id;
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const audio = new Audio(activeSeg.audioUrl);
      activeAudioRef.current = audio;
      audio.play().catch(() => {});
    } else if (!activeSeg) {
      lastTriggeredSegmentId.current = null;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    lastTriggeredSegmentId.current = null;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
  };

  // Run full export pipeline
  const handleStartExport = async () => {
    try {
      setExportProgress({
        isExporting: true,
        progress: 0,
        currentPhase: 'Bắt đầu quá trình ghép nối video & âm thanh...',
        exportedBlobUrl: null,
        exportedAudioUrl: null,
        exportedMimeType: 'video/mp4',
      });

      const result = await exportCompositeVideo(
        videoData.url,
        script.segments,
        {
          includeSubtitles,
          includeCursorEffects,
          videoDuration: videoData.duration,
        },
        voiceSettings,
        (progress, phase) => {
          setExportProgress((prev) => ({
            ...prev,
            progress,
            currentPhase: phase,
          }));
        }
      );

      const videoUrl = URL.createObjectURL(result.videoBlob);
      const audioUrl = URL.createObjectURL(result.audioBlob);
      const sizeMb = Number((result.videoBlob.size / (1024 * 1024)).toFixed(2));

      setExportProgress({
        isExporting: false,
        progress: 100,
        currentPhase: 'Đã hoàn thành xuất bản video có cả tiếng lẫn hình!',
        exportedBlobUrl: videoUrl,
        exportedAudioUrl: audioUrl,
        exportedMimeType: result.mimeType,
        fileSizeMb: sizeMb,
      });

      // Update preview player to use the final composite video with audio track
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
        videoRef.current.currentTime = 0;
      }
    } catch (err: any) {
      console.error(err);
      setExportProgress({
        isExporting: false,
        progress: 0,
        currentPhase: 'Lỗi xuất video: ' + (err.message || 'Thử lại'),
        exportedBlobUrl: null,
        exportedAudioUrl: null,
        exportedMimeType: 'video/mp4',
      });
      alert('Không thể xuất video: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const getCleanFileName = (ext: string) => {
    const raw = script.title || 'AutoVoice_Camtasia_Video';
    const clean = raw.replace(/[\\/:*?"<>|]/g, '_').trim().replace(/\s+/g, '_');
    return `${clean}.${ext}`;
  };

  // Download video file with specified extension (.mp3 or .mp4)
  const handleDownloadVideoWithExt = (ext: 'mp3' | 'mp4') => {
    if (!exportProgress.exportedBlobUrl) return;
    const a = document.createElement('a');
    a.href = exportProgress.exportedBlobUrl;
    a.download = getCleanFileName(ext);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download pure audio track (.mp3)
  const handleDownloadAudioOnly = () => {
    if (!exportProgress.exportedAudioUrl) return;
    const a = document.createElement('a');
    a.href = exportProgress.exportedAudioUrl;
    a.download = `${(script.title || 'Voiceover').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_')}_Audio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download SRT
  const handleDownloadSrt = () => {
    const srt = generateSrtContent(script.segments);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCleanFileName('srt')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Script TXT
  const handleDownloadTxt = () => {
    let content = `TIÊU ĐỀ: ${script.title}\nTÓM TẮT: ${script.summary}\n\n`;
    content += `KỊCH BẢN PHÂN ĐOẠN ĐỒNG BỘ:\n`;
    script.segments.forEach((seg, i) => {
      content += `[${seg.startTime}s -> ${seg.endTime}s] (${seg.action})\nLỜI THOẠI: ${seg.voiceoverText}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCleanFileName('txt')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Current active segment for real-time preview display
  const activeSegment = script.segments.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Bước 5: Ghép Nối &amp; Xuất Bản Video Hoàn Chỉnh
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Xuất Bản Video Có Cả Tiếng Lẫn Hình (Định Dạng Theo Yêu Cầu)
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              Video được tự động ghép nối hoàn hảo giữa cử động chuột Camtasia, giọng thuyết minh AI
              (đã được kích hoạt âm thanh 100%) và phụ đề trực quan. Mặc định tải video về có đuôi <strong>.mp3</strong> (hoặc <strong>.mp4</strong>) với đầy đủ cả tiếng lẫn hình.
            </p>
          </div>

          {!exportProgress.isExporting && !exportProgress.exportedBlobUrl && (
            <button
              onClick={handleStartExport}
              className="self-start sm:self-auto flex items-center gap-2 text-sm font-extrabold px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Bắt Đầu Ghép Nối &amp; Xuất Video
            </button>
          )}
        </div>
      </div>

      {/* Exporting progress view */}
      {exportProgress.isExporting && (
        <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              {exportProgress.currentPhase}
            </span>
            <span className="font-mono text-white font-extrabold text-base">
              {exportProgress.progress}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-200"
              style={{ width: `${exportProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">
            Hệ thống đang chạy bộ dựng hình Canvas + Web Audio đa kênh để hòa trộn giọng đọc và kích hoạt luồng âm thanh vào video...
          </p>
        </div>
      )}

      {/* SUCCESS DOWNLOAD CARD (Prominent Download Area) */}
      {exportProgress.exportedBlobUrl && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border-2 border-emerald-500/70 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-500/30">
                <Download className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white">
                    Video Đã Xuất Bản Thành Công!
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Headphones className="w-3 h-3" /> CÓ TIẾNG + HÌNH 100%
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Dung lượng: ~{exportProgress.fileSizeMb || 2.4} MB • Thời lượng: {videoData.duration.toFixed(1)}s • Âm thanh stereo đã hòa trộn
                </p>
              </div>
            </div>

            {/* FORMAT SELECTOR & PRIMARY DOWNLOAD */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Default Selector */}
              <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setDefaultFormat('mp3')}
                  className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    defaultFormat === 'mp3'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tải video về có đuôi .mp3 theo yêu cầu"
                >
                  <span>Đuôi .mp3</span>
                  <span className="text-[10px] opacity-75">(Mặc định)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultFormat('mp4')}
                  className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    defaultFormat === 'mp4'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tải video chuẩn .mp4 phổ biến"
                >
                  <span>Đuôi .mp4</span>
                  <span className="text-[10px] opacity-75">(Chuẩn video)</span>
                </button>
              </div>

              {/* PRIMARY DOWNLOAD BUTTON (Defaults to .mp3 as requested) */}
              <button
                onClick={() => handleDownloadVideoWithExt(defaultFormat)}
                className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-500/30 active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>TẢI VIDEO ({defaultFormat.toUpperCase()}) - CẢ TIẾNG LẪN HÌNH</span>
              </button>
            </div>
          </div>

          {/* SECONDARY EXPLICIT DOWNLOAD BUTTONS */}
          <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-3">
            <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Chọn định dạng tải xuống phù hợp với máy của bạn:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: .mp3 (with video & audio) */}
              <button
                onClick={() => handleDownloadVideoWithExt('mp3')}
                className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" /> Video đuôi .mp3
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    Mặc định
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Có đầy đủ hình ảnh &amp; tiếng lồng tiếng theo yêu cầu của bạn.
                </p>
              </button>

              {/* Option 2: .mp4 (standard video container) */}
              <button
                onClick={() => handleDownloadVideoWithExt('mp4')}
                className="p-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-sky-400" /> Video đuôi .mp4
                  </span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    Chuẩn HD
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Định dạng video quốc tế tương thích 100% mọi trình phát và CapCut.
                </p>
              </button>

              {/* Option 3: pure audio .mp3 */}
              <button
                onClick={handleDownloadAudioOnly}
                className="p-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-violet-400" /> Audio .mp3 (Chỉ tiếng)
                  </span>
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    Âm thanh
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tải riêng toàn bộ file giọng đọc thuyết minh để ghép vào Camtasia.
                </p>
              </button>
            </div>
          </div>

          {/* Tertiary Links: SRT & TXT */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-zinc-800 text-xs">
            <span className="text-zinc-400 font-medium">Tài nguyên kịch bản:</span>

            <button
              onClick={handleDownloadSrt}
              className="font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Tải file phụ đề (.SRT)
            </button>

            <button
              onClick={handleDownloadTxt}
              className="font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Tải kịch bản (.TXT)
            </button>

            <button
              onClick={handleStartExport}
              className="font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xuất lại video
            </button>
          </div>
        </div>
      )}

      {/* Main Synchronized Video Player & Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Player (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                {exportProgress.exportedBlobUrl
                  ? 'Trình Phát Video Hoàn Chỉnh (Có Cả Tiếng & Hình)'
                  : 'Trình Phát Xem Trước Đồng Bộ (Live Preview)'}
              </h3>

              {/* Toggles */}
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeSubtitles}
                    onChange={(e) => setIncludeSubtitles(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Phụ đề CC</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeCursorEffects}
                    onChange={(e) => setIncludeCursorEffects(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Hiệu ứng chuột</span>
                </label>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black aspect-video select-none group">
              <video
                ref={videoRef}
                src={exportProgress.exportedBlobUrl || videoData.url}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Camtasia Yellow Cursor Spotlight Overlay during Preview (only if not final baked video) */}
              {!exportProgress.exportedBlobUrl && includeCursorEffects && activeSegment && (
                <div
                  className="absolute pointer-events-none transition-all duration-300 ease-out"
                  style={{
                    left: `${activeSegment.cursorPosition.x}%`,
                    top: `${activeSegment.cursorPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-amber-400/25 border-2 border-amber-400 flex items-center justify-center animate-cursor-pulse">
                    <div className="w-4 h-4 rounded-full bg-amber-400/50" />
                  </div>

                  {activeSegment.calloutText && (
                    <div className="absolute left-8 -top-3 whitespace-nowrap bg-zinc-950/90 text-sky-400 font-bold text-[11px] px-2 py-0.5 rounded border border-sky-500/40 shadow">
                      {activeSegment.calloutText}
                    </div>
                  )}
                </div>
              )}

              {/* Subtitles CC Banner Overlay (only if not final baked video) */}
              {!exportProgress.exportedBlobUrl && includeSubtitles && activeSegment && activeSegment.voiceoverText && (
                <div className="absolute bottom-12 left-6 right-6 flex justify-center pointer-events-none">
                  <div className="bg-zinc-950/90 text-white font-bold text-sm sm:text-base px-5 py-2.5 rounded-xl border border-emerald-500 shadow-2xl text-center max-w-xl">
                    {activeSegment.voiceoverText}
                  </div>
                </div>
              )}

              {/* Custom Controller Bar */}
              <div className="absolute bottom-2 left-2 right-2 bg-zinc-950/90 backdrop-blur px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                {/* Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={videoData.duration || 10}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-500 cursor-pointer h-1.5"
                />

                <span className="font-mono text-zinc-300">
                  {currentTime.toFixed(1)}s / {videoData.duration.toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Segments Timeline Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Các Đoạn Lồng Tiếng Đã Đồng Bộ
              </h3>
              <button
                onClick={onBackToScript}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline"
              >
                Chỉnh sửa lời thoại
              </button>
            </div>

            {/* Segments stream */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {script.segments.map((seg, idx) => {
                const isCurrent = currentTime >= seg.startTime && currentTime <= seg.endTime;

                return (
                  <div
                    key={seg.id}
                    onClick={() => handleSeek(seg.startTime)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-zinc-800 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-emerald-400">
                        {seg.startTime.toFixed(1)}s → {seg.endTime.toFixed(1)}s
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {seg.action}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                      "{seg.voiceoverText}"
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Export Trigger if not exported yet */}
            {!exportProgress.exportedBlobUrl && (
              <div className="pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleStartExport}
                  disabled={exportProgress.isExporting}
                  className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>XUẤT BẢN VIDEO CÓ CẢ TIẾNG LẪN HÌNH</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
