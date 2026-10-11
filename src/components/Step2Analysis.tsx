import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, Play, Pause, CheckCircle2, AlertTriangle, ArrowRight, MousePointer2, Sparkles, Layers, Eye, RefreshCw } from 'lucide-react';
import { DetectedMoment, VideoSourceData } from '../types';
import { analyzeVideoFrames } from '../utils/videoAnalyzer';

interface Step2AnalysisProps {
  videoData: VideoSourceData;
  detectedMoments: DetectedMoment[];
  onMomentsAnalyzed: (moments: DetectedMoment[]) => void;
  onProceedToStep3: () => void;
}

export const Step2Analysis: React.FC<Step2AnalysisProps> = ({
  videoData,
  detectedMoments,
  onMomentsAnalyzed,
  onProceedToStep3,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedMoment, setSelectedMoment] = useState<DetectedMoment | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Auto-run analysis when entering step if not analyzed yet
  useEffect(() => {
    if (detectedMoments.length === 0 && !isScanning && videoData.url) {
      runAnalysis();
    } else if (detectedMoments.length > 0 && !selectedMoment) {
      setSelectedMoment(detectedMoments[0]);
    }
  }, [videoData.url]);

  const runAnalysis = async () => {
    try {
      setIsScanning(true);
      setScanProgress(0);
      setStatusMessage('Đang tải và chuẩn bị video...');

      const moments = await analyzeVideoFrames(videoData.url, (pct, status) => {
        setScanProgress(pct);
        setStatusMessage(status);
      });

      onMomentsAnalyzed(moments);
      if (moments.length > 0) {
        setSelectedMoment(moments[0]);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Lỗi phân tích: ' + (err.message || 'Không thể đọc video'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectMoment = (moment: DetectedMoment) => {
    setSelectedMoment(moment);
    if (videoRef.current) {
      videoRef.current.currentTime = moment.timestamp;
      setCurrentTime(moment.timestamp);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const clickCount = detectedMoments.filter((m) => m.actionType === 'CLICK').length;
  const menuCount = detectedMoments.filter((m) => m.actionType === 'MENU_OPEN').length;
  const typeCount = detectedMoments.filter((m) => m.actionType === 'TYPE_INPUT').length;
  const moveCount = detectedMoments.filter((m) => m.actionType === 'DRAG_MOVE' || m.actionType === 'HOVER').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
              <Crosshair className="w-3.5 h-3.5" />
              Bước 2: Trích Xuất &amp; Phân Tích Thao Tác Video
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dò Tìm Vị Trí Con Trỏ Chuột &amp; Cú Nhấp Camtasia
            </h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Hệ thống quét quang sai từng khung hình để phát hiện chính xác thời điểm nhấp chuột (clicks),
              vệt di chuyển con trỏ và tương tác màn hình nhằm đồng bộ chuẩn xác với lời thoại AI.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isScanning}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-teal-400' : ''}`} />
            {isScanning ? 'Đang quét lại...' : 'Phân tích lại'}
          </button>
        </div>
      </div>

      {/* Progress if scanning */}
      {isScanning && (
        <div className="bg-zinc-900 border border-teal-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-teal-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
              {statusMessage}
            </span>
            <span className="font-mono text-zinc-300 font-bold">{scanProgress}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats summary bar */}
      {detectedMoments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-xs text-zinc-400 font-medium">Tổng thời lượng video</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
              {Math.floor(videoData.duration / 60)}:{(Math.floor(videoData.duration % 60)).toString().padStart(2, '0')}
              <span className="text-[10px] text-zinc-500 font-normal ml-1">/ 5:00 max</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-xs text-zinc-400 font-medium">Cú nhấp chuột (Clicks)</div>
            <div className="text-xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
              {clickCount}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-normal">
                Điểm nhấn
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-xs text-zinc-400 font-medium">Mở Menu / Hộp thoại</div>
            <div className="text-xl font-extrabold text-sky-400 mt-1">{menuCount}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-xs text-zinc-400 font-medium">Gõ phím / Ô nhập</div>
            <div className="text-xl font-extrabold text-purple-400 mt-1">{typeCount}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="text-xs text-zinc-400 font-medium">Khung hình phát hiện</div>
            <div className="text-xl font-extrabold text-teal-400 mt-1">{detectedMoments.length}</div>
          </div>
        </div>
      )}

      {/* Main Analysis View: Video Player with Cursor Overlay & Moments List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Video Player with Real-time Cursor Radar (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-emerald-400" />
                Vị Trí Con Trỏ &amp; Điểm Tương Tác Trực Quan
              </h3>
              {selectedMoment && (
                <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                  Tọa độ chuột: X={selectedMoment.cursorX}%, Y={selectedMoment.cursorY}%
                </span>
              )}
            </div>

            {/* Video Player Container */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black aspect-video">
              <video
                ref={videoRef}
                src={videoData.url}
                className="w-full h-full object-contain"
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Camtasia-style Yellow Cursor Radar for Selected Moment */}
              {selectedMoment && (
                <div
                  className="absolute pointer-events-none transition-all duration-200"
                  style={{
                    left: `${selectedMoment.cursorX}%`,
                    top: `${selectedMoment.cursorY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Spotlight Yellow Halo */}
                  <div className="w-16 h-16 rounded-full bg-amber-400/25 border-2 border-amber-400 animate-cursor-pulse flex items-center justify-center">
                    {selectedMoment.actionType === 'CLICK' && (
                      <div className="w-24 h-24 rounded-full border-2 border-amber-400/60 animate-click-ripple absolute" />
                    )}
                  </div>

                  {/* Mouse Arrow Icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg text-white">
                    <MousePointer2 className="w-6 h-6 fill-white text-black stroke-[1.5]" />
                  </div>

                  {/* Tooltip Tag */}
                  <div className="absolute left-8 -top-3 whitespace-nowrap bg-zinc-950/90 text-amber-300 font-semibold text-[11px] px-2.5 py-1 rounded-md border border-amber-500/40 shadow-lg">
                    {selectedMoment.actionLabel}
                  </div>
                </div>
              )}

              {/* Floating Play Control */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-zinc-950/80 backdrop-blur px-3 py-2 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="font-mono text-zinc-300">
                  {currentTime.toFixed(1)}s / {videoData.duration.toFixed(1)}s
                </div>

                <div className="text-[11px] text-zinc-400">
                  Bấm vào danh sách bên phải để nhảy tới điểm thao tác
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detected Moments Timeline List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Dòng Thời Gian Thao Tác Chuột
              </h3>
              <span className="text-xs text-zinc-400">
                {detectedMoments.length} mốc thời gian
              </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {detectedMoments.map((moment) => {
                const isSelected = selectedMoment?.id === moment.id;
                const isClick = moment.actionType === 'CLICK';

                return (
                  <div
                    key={moment.id}
                    onClick={() => handleSelectMoment(moment)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800 border-amber-500 shadow-sm shadow-amber-500/10'
                        : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    {/* Frame Thumbnail */}
                    {moment.frameThumbnail ? (
                      <div className="w-16 h-10 rounded-md overflow-hidden bg-black shrink-0 border border-zinc-800 relative">
                        <img
                          src={moment.frameThumbnail}
                          alt={`Frame ${moment.timestamp}`}
                          className="w-full h-full object-cover"
                        />
                        {isClick && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-black" />
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-10 rounded-md bg-zinc-800 shrink-0 flex items-center justify-center text-zinc-600">
                        <Eye className="w-4 h-4" />
                      </div>
                    )}

                    {/* Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-zinc-200">
                          {moment.timestampDisplay}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isClick
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : moment.actionType === 'MENU_OPEN'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : moment.actionType === 'TYPE_INPUT'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {moment.actionType}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-1">
                        {moment.actionLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Button to proceed */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onProceedToStep3}
                disabled={detectedMoments.length === 0}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Chuyển sang Bước 3: Đạo Diễn Kịch Bản AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
