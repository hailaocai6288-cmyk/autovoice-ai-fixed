import React, { useState, useRef } from 'react';
import { Upload, Video, Sparkles, Play, Check, AlertCircle, FileVideo, Clock, Layers, Globe, AlertTriangle, Scissors, Info } from 'lucide-react';
import { MAX_VIDEO_DURATION_SECONDS, RECOMMENDED_MAX_DURATION_SECONDS, ScriptLanguage, VideoSourceData } from '../types';
import { generateSampleScreenRecording } from '../utils/sampleVideoGenerator';

interface Step1InputProps {
  videoData: VideoSourceData | null;
  onVideoSelected: (video: VideoSourceData) => void;
  language: ScriptLanguage;
  onLanguageChange: (lang: ScriptLanguage) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  targetAudience: string;
  onTargetAudienceChange: (aud: string) => void;
  tone: string;
  onToneChange: (tone: string) => void;
  voiceGender: string;
  onVoiceGenderChange: (gender: string) => void;
  onProceedToStep2: () => void;
}

export const Step1Input: React.FC<Step1InputProps> = ({
  videoData,
  onVideoSelected,
  language,
  onLanguageChange,
  topic,
  onTopicChange,
  targetAudience,
  onTargetAudienceChange,
  tone,
  onToneChange,
  voiceGender,
  onVoiceGenderChange,
  onProceedToStep2,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Suggestions based on language
  const suggestedTopicsVi = [
    'Hướng dẫn tạo Video tự động bằng AI trên Flow',
    'Cách xuất video chất lượng cao 1080p 60fps trên Camtasia',
    'Quy trình tạo ảnh minh họa bằng trí tuệ nhân tạo',
    'Hướng dẫn sử dụng công cụ cắt ghép và hiệu ứng video',
  ];

  const suggestedTopicsEn = [
    'How to Create Automated AI Videos on Flow',
    'How to Export 1080p 60fps High Quality Video in Camtasia',
    'Beginner Tutorial for Creating AI Voiceovers',
    'Step-by-Step Guide to Video Trimming and Effects',
  ];

  const suggestedTopics = language === 'en' ? suggestedTopicsEn : suggestedTopicsVi;

  const handleFileUpload = (file: File) => {
    if (!file.type.includes('video') && !file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) {
      alert('Vui lòng chọn file video định dạng .mp4 hoặc .webm');
      return;
    }

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      onVideoSelected({
        file,
        url,
        name: file.name,
        duration: tempVideo.duration || 10,
        width: tempVideo.videoWidth || 1280,
        height: tempVideo.videoHeight || 720,
        isSample: false,
      });
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUseSample = async () => {
    try {
      setIsGeneratingSample(true);
      setSampleProgress(5);
      const defaultTitle =
        language === 'en'
          ? 'How to Create Automated AI Videos on Flow'
          : 'Hướng dẫn tạo Video tự động bằng AI trên Flow';

      const sample = await generateSampleScreenRecording(
        topic || defaultTitle,
        (pct) => setSampleProgress(pct)
      );
      onVideoSelected(sample);
      if (!topic.trim()) {
        onTopicChange(defaultTitle);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tạo video mẫu. Vui lòng thử tải lên video mp4 từ máy của bạn.');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  // Duration formatting helpers
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDurationOverLimit = Boolean(videoData && videoData.duration > MAX_VIDEO_DURATION_SECONDS);
  const isDurationLong = Boolean(videoData && videoData.duration > RECOMMENDED_MAX_DURATION_SECONDS && !isDurationOverLimit);

  const handleTrimVideo = () => {
    if (!videoData) return;
    // Set trimmed duration to 180s (3 minutes)
    onVideoSelected({
      ...videoData,
      duration: RECOMMENDED_MAX_DURATION_SECONDS,
      name: `${videoData.name} (Đã cắt 3 phút đầu)`,
    });
  };

  const isValidToProceed = Boolean(videoData && topic.trim() && !isDurationOverLimit);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Bước 1: Nhập Liệu &amp; Cấu Hình Dự Án
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tải Lên Video Quay Màn Hình Camtasia
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Hệ thống sẽ tự động quét từng khung hình, nhận diện vị trí con trỏ chuột và các cú nhấp chuột (clicks)
            để đạo diễn kịch bản thuyết minh hoàn hảo khớp từng giây bằng Gemini AI.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Video Input (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-emerald-400" />
                1. Tải lên file video (.mp4 từ Camtasia)
              </label>

              <button
                type="button"
                onClick={handleUseSample}
                disabled={isGeneratingSample}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingSample ? `Đang tạo video mẫu (${sampleProgress}%)...` : 'Dùng Video Mẫu Camtasia (1-Click)'}
              </button>
            </div>

            {/* Upload Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {!videoData ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-950/60 hover:border-zinc-500 hover:bg-zinc-900/60'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-300 mb-4 group-hover:scale-105 transition">
                  <Upload className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  Kéo thả file video Camtasia vào đây, hoặc <span className="text-emerald-400 underline">bấm để chọn file</span>
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Định dạng hỗ trợ: MP4, WebM (xuất từ Camtasia, OBS, Loom hoặc Screen Recorder)
                </p>

                {/* Duration limits guide note */}
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Thời lượng tối ưu: <strong>15 giây - 3 phút</strong> (Tối đa <strong>5 phút / 300 giây</strong>)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Preview */}
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black aspect-video group">
                  <video
                    src={videoData.url}
                    controls
                    className="w-full h-full object-contain"
                  />
                  {videoData.isSample && (
                    <div className="absolute top-3 left-3 bg-emerald-500/90 text-black text-[11px] font-bold px-2.5 py-1 rounded-md shadow">
                      ✓ Video Mẫu Camtasia Đã Sẵn Sàng
                    </div>
                  )}
                </div>

                {/* Video Info & Duration Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileVideo className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-200 truncate max-w-xs">{videoData.name}</div>
                      <div className="text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span>Độ phân giải: {videoData.width}x{videoData.height} px</span>
                      </div>
                    </div>
                  </div>

                  {/* DURATION PILL */}
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg border font-mono font-bold flex items-center gap-1.5 ${
                      isDurationOverLimit
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : isDurationLong
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(videoData.duration)} ({videoData.duration.toFixed(1)}s)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition"
                    >
                      Đổi video khác
                    </button>
                  </div>
                </div>

                {/* OVER-LIMIT WARNING NOTIFICATION */}
                {isDurationOverLimit && (
                  <div className="bg-rose-950/60 border-2 border-rose-600 rounded-xl p-4 text-rose-200 space-y-3 shadow-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-rose-100">
                          Cảnh báo: Thời lượng video vượt quá giới hạn cho phép!
                        </div>
                        <p className="text-xs text-rose-300/90 leading-relaxed">
                          Tổng thời lượng video là <strong>{formatDuration(videoData.duration)} ({videoData.duration.toFixed(1)}s)</strong>,
                          vượt quá mức tối đa là <strong>5 phút ({MAX_VIDEO_DURATION_SECONDS}s)</strong>.
                          Video quá dài sẽ vượt quá giới hạn xử lý và phân tích thao tác chuột.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTrimVideo}
                        className="text-xs font-bold px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Tự động cắt lấy 3 phút đầu ({RECOMMENDED_MAX_DURATION_SECONDS}s)
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-medium text-rose-300 hover:underline cursor-pointer"
                      >
                        Tải video khác ngắn hơn
                      </button>
                    </div>
                  </div>
                )}

                {/* LONG VIDEO NOTICE */}
                {isDurationLong && (
                  <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3 text-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Thời lượng video khá dài ({formatDuration(videoData.duration)}). Thời lượng khuyến nghị cho video hướng dẫn ngắn là dưới 3 phút để đảm bảo tốc độ phân tích nhanh nhất.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTrimVideo}
                      className="ml-2 text-xs font-semibold px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 shrink-0 cursor-pointer"
                    >
                      Cắt lấy 3 phút
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Language, Topic & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              2. Ngôn Ngữ &amp; Kịch Bản Thuyết Minh
            </h3>

            {/* LANGUAGE SELECTOR (TIẾNG VIỆT VS TIẾNG ANH) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Ngôn ngữ giọng đọc &amp; kịch bản:
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {language === 'vi' ? 'Tiếng Việt' : 'English'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Vietnamese */}
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('vi');
                    if (!topic.trim() || topic === 'How to Create Automated AI Videos on Flow') {
                      onTopicChange('Hướng dẫn tạo Video tự động bằng AI trên Flow');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    language === 'vi'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇻🇳</span>
                    <span className="font-bold text-xs">Tiếng Việt</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Thuyết minh tiếng Việt chuẩn, tự nhiên
                  </p>
                </button>

                {/* English */}
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('en');
                    if (!topic.trim() || topic === 'Hướng dẫn tạo Video tự động bằng AI trên Flow') {
                      onTopicChange('How to Create Automated AI Videos on Flow');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-xs">English</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Fluent English voiceover narration
                  </p>
                </button>
              </div>
            </div>

            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                {language === 'en' ? 'Video Topic / Title' : 'Chủ đề / Tiêu đề video'} <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'e.g. How to Create Automated AI Videos on Flow'
                    : 'Ví dụ: Hướng dẫn tạo Video tự động bằng AI trên Flow'
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition resize-none"
              />

              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-400">
                  {language === 'en' ? 'Quick suggestions:' : 'Gợi ý chủ đề nhanh:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTopics.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => onTopicChange(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition text-left cursor-pointer truncate max-w-full"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                {language === 'en' ? 'Target Audience' : 'Đối tượng khán giả'}
              </label>
              <select
                value={targetAudience}
                onChange={(e) => onTargetAudienceChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {language === 'en' ? (
                  <>
                    <option value="Beginners - Step-by-step clear guidance">Beginners (Step-by-step clear guidance)</option>
                    <option value="Professionals & Enterprise - Efficient & crisp">Professionals &amp; Enterprise</option>
                    <option value="Developers & Engineers - Technical & concise">Developers &amp; Engineers</option>
                    <option value="Students & General Users - Friendly & engaging">Students &amp; General Users</option>
                  </>
                ) : (
                  <>
                    <option value="Người mới bắt đầu (Beginner) - Giải thích từng bước dễ hiểu">
                      Người mới bắt đầu (Dễ hiểu, chi tiết)
                    </option>
                    <option value="Dân văn phòng & Doanh nghiệp - Tác phong chuyên nghiệp, tiết kiệm thời gian">
                      Dân văn phòng &amp; Doanh nghiệp
                    </option>
                    <option value="Kỹ thuật viên & Lập trình viên - Ngắn gọn, tập trung vào thao tác chính">
                      Kỹ thuật viên / Lập trình viên
                    </option>
                    <option value="Học sinh / Sinh viên - Gần gũi, năng động">
                      Học sinh &amp; Sinh viên
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* Tone of Voice */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === 'en' ? 'Tone Style' : 'Phong cách đọc'}
                </label>
                <select
                  value={tone}
                  onChange={(e) => onToneChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  {language === 'en' ? (
                    <>
                      <option value="Professional & articulate">Professional &amp; articulate</option>
                      <option value="Friendly, engaging & casual">Friendly &amp; engaging</option>
                      <option value="Educational & instructional">Educational &amp; instructional</option>
                      <option value="Fast-paced & concise">Fast-paced &amp; punchy</option>
                    </>
                  ) : (
                    <>
                      <option value="Chuyên nghiệp, chuẩn mực truyền hình">Chuyên nghiệp, rõ ràng</option>
                      <option value="Thân thiện, vui vẻ và gần gũi">Thân thiện, gần gũi</option>
                      <option value="Sư phạm, chuẩn giọng giáo viên">Sư phạm, từ tốn</option>
                      <option value="Nhanh gọn, dứt khoát kiểu TikTok/Reels">Nhanh gọn, dứt khoát</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {language === 'en' ? 'Voice Gender' : 'Giới tính giọng'}
                </label>
                <select
                  value={voiceGender}
                  onChange={(e) => onVoiceGenderChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Nữ">{language === 'en' ? 'Female' : 'Giọng Nữ (Truyền cảm)'}</option>
                  <option value="Nam">{language === 'en' ? 'Male' : 'Giọng Nam (Trầm ấm)'}</option>
                </select>
              </div>
            </div>

            {/* Next Action Button */}
            <div className="pt-3">
              <button
                type="button"
                disabled={!isValidToProceed}
                onClick={onProceedToStep2}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isValidToProceed
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 cursor-pointer active:scale-[0.99]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                }`}
              >
                <span>Chuyển sang Bước 2: Phân Tích Thao Tác Chuột</span>
                <span className="font-mono">→</span>
              </button>

              {!isValidToProceed && (
                <div className="text-[11px] text-zinc-400 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {isDurationOverLimit ? (
                    <span className="text-rose-400 font-semibold">
                      Video quá dài (&gt; 5 phút). Vui lòng cắt video hoặc tải video ngắn hơn.
                    </span>
                  ) : !videoData ? (
                    <span>Vui lòng tải lên video để tiếp tục</span>
                  ) : (
                    <span>Vui lòng nhập chủ đề video để tiếp tục</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
