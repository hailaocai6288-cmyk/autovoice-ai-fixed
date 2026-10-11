import { ScriptSegment, VoiceSettings } from '../types';
import { generateSegmentVoiceover, createSyntheticAudioFallback, createMergedVoiceoverAudio, planVoiceSchedule } from './audioSynthesizer';

export interface ExportOptions {
  includeSubtitles: boolean;
  includeCursorEffects: boolean;
  videoDuration: number;
}

export interface ExportCompositeResult {
  videoBlob: Blob;
  audioBlob: Blob;
  mimeType: string;
}

export function generateSrtContent(segments: ScriptSegment[]): string {
  const formatSrtTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  return segments
    .map((seg, idx) => {
      return `${idx + 1}\n${formatSrtTime(seg.startTime)} --> ${formatSrtTime(seg.endTime)}\n${seg.voiceoverText}\n`;
    })
    .join('\n');
}

export async function exportCompositeVideo(
  videoSourceUrl: string,
  segments: ScriptSegment[],
  options: ExportOptions,
  voiceSettings?: VoiceSettings,
  onProgress?: (progress: number, phase: string) => void
): Promise<ExportCompositeResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoSourceUrl;
      video.muted = false; // keep audio active for MediaElementSource
      video.volume = 1.0;
      video.playsInline = true;

      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Không thể tải video nguồn'));
      });

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const duration = Math.min(options.videoDuration || video.duration, 300);

      // Canvas setup
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D');

      // Web Audio Context setup for mixing voiceover segments
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      // CRITICAL FIX: Always resume AudioContext to activate clock and audio processing!
      await audioCtx.resume();

      const audioDestination = audioCtx.createMediaStreamDestination();

      // 1. Keep audio track continuously active so MediaRecorder never drops audio stream
      const silenceBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
      const silenceSource = audioCtx.createBufferSource();
      silenceSource.buffer = silenceBuffer;
      silenceSource.loop = true;
      silenceSource.connect(audioDestination);
      silenceSource.start(0);

      // 2. Ensure ALL segments have voiceover audio! If missing, synthesize on-the-fly!
      if (onProgress) onProgress(4, 'Đang chuẩn bị và kiểm tra giọng đọc lồng tiếng...');

      const defaultSettings: VoiceSettings = voiceSettings || {
        engine: 'gemini',
        language: 'vi',
        geminiVoice: 'Kore',
        browserVoice: '',
        speechRate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      };

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg.audioBlob && seg.voiceoverText?.trim()) {
          if (onProgress) {
            onProgress(
              5 + Math.round((i / segments.length) * 10),
              `Đang tạo giọng đọc tự động cho đoạn ${i + 1}/${segments.length}...`
            );
          }
          try {
            const synth = await generateSegmentVoiceover(
              seg.voiceoverText,
              defaultSettings,
              seg.endTime - seg.startTime
            );
            seg.audioBlob = synth.audioBlob;
            seg.audioUrl = synth.audioUrl;
            seg.audioDuration = synth.duration;
          } catch (err) {
            console.warn('Synthesis fallback for segment', i, err);
            const fallback = createSyntheticAudioFallback(seg.voiceoverText, seg.endTime - seg.startTime);
            seg.audioBlob = fallback.audioBlob;
            seg.audioUrl = fallback.audioUrl;
            seg.audioDuration = fallback.duration;
          }
        }
      }

      // Decode and prepare all audio buffers
      if (onProgress) onProgress(15, 'Đang đồng bộ hóa các luồng âm thanh...');
      const decodedBuffers: { startTime: number; endTime: number; buffer: AudioBuffer }[] = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.audioBlob) {
          try {
            const arrayBuf = await seg.audioBlob.arrayBuffer();
            const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
            decodedBuffers.push({
              startTime: seg.startTime,
              endTime: seg.endTime,
              buffer: audioBuf,
            });
          } catch (e) {
            console.warn(`Could not decode audio for segment ${seg.id}`, e);
          }
        }
      }

      // 3. Connect original video audio if present (e.g. mouse clicks, background sound)
      try {
        const videoAudio = audioCtx.createMediaElementSource(video);
        const videoGain = audioCtx.createGain();
        videoGain.gain.value = 0.8;
        videoAudio.connect(videoGain);
        videoGain.connect(audioDestination);
      } catch (e) {
        console.warn('Original video media element source routing skipped:', e);
      }

      // 4. Also generate a standalone combined audio file
      const mergedAudioBlob = await createMergedVoiceoverAudio(segments, duration);

      // 5. Combine video canvas stream and audio destination stream
      const canvasStream = canvas.captureStream(30);
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // Pick best supported MIME type (prefer MP4 container with H264 & AAC if available)
      const candidateTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      let mimeType = '';
      for (const t of candidateTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }
      if (!mimeType) mimeType = 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4_500_000,
        audioBitsPerSecond: 192_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        audioCtx.close();
        const finalVideoBlob = new Blob(chunks, { type: mimeType });
        resolve({
          videoBlob: finalVideoBlob,
          audioBlob: mergedAudioBlob,
          mimeType,
        });
      };

      // 6. Schedule all voiceover audio playbacks with crisp vocal presence
      const startAudioPlayback = () => {
        const baseAudioTime = audioCtx.currentTime;
        // Không cho 2 đoạn đọc chồng nhau; lời dài hơn khung thì tăng nhẹ tốc độ (tối đa 1.15x)
        const plan = planVoiceSchedule(
          decodedBuffers.map((d) => ({ startTime: d.startTime, endTime: d.endTime, duration: d.buffer.duration }))
        );
        decodedBuffers.forEach(({ buffer }, idx) => {
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = plan[idx].rate;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.0; // 1.35 cũ gây vỡ tiếng (clipping)
          source.connect(gainNode);
          gainNode.connect(audioDestination);
          source.start(baseAudioTime + plan[idx].start);
        });
      };

      recorder.start();
      startAudioPlayback();
      video.currentTime = 0;
      await video.play();

      let animationFrameId: number;
      const startTime = performance.now();

      const renderFrame = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progressPct = Math.min(99, Math.round((elapsed / duration) * 80) + 20);

        if (onProgress) {
          onProgress(
            progressPct,
            `Đang ghép nối hình ảnh & giọng đọc lồng tiếng: ${elapsed.toFixed(1)}s / ${duration.toFixed(1)}s`
          );
        }

        // Draw current video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Find active segment
        const activeSegment = segments.find(
          (s) => elapsed >= s.startTime && elapsed <= s.endTime
        );

        // Draw Camtasia Cursor & Spotlight Effects
        if (options.includeCursorEffects && activeSegment) {
          const cx = (activeSegment.cursorPosition.x / 100) * width;
          const cy = (activeSegment.cursorPosition.y / 100) * height;

          // Spotlight yellow halo
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, 32, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(234, 179, 8, 0.28)';
          ctx.fill();

          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Ripple if click action
          const isClick =
            activeSegment.action.toLowerCase().includes('nhấp') ||
            activeSegment.action.toLowerCase().includes('click');
          if (isClick) {
            const rippleProgress = elapsed % 1.0;
            const rippleR = 20 + rippleProgress * 40;
            ctx.beginPath();
            ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(234, 179, 8, ${Math.max(0, 1 - rippleProgress)})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Cursor pointer
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy + 20);
          ctx.lineTo(cx + 5, cy + 15);
          ctx.lineTo(cx + 10, cy + 25);
          ctx.lineTo(cx + 14, cy + 23);
          ctx.lineTo(cx + 8, cy + 14);
          ctx.lineTo(cx + 15, cy + 14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Callout label near cursor
          if (activeSegment.calloutText) {
            ctx.save();
            ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
            const label = activeSegment.calloutText;
            const textW = ctx.measureText(label).width;
            const bx = Math.min(width - textW - 30, Math.max(10, cx + 24));
            const by = Math.min(height - 40, Math.max(30, cy - 10));

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(bx - 10, by - 20, textW + 20, 28, [6]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(label, bx, by);
            ctx.restore();
          }
        }

        // Draw Subtitle CC
        if (options.includeSubtitles && activeSegment && activeSegment.voiceoverText) {
          ctx.save();
          const subtitleText = activeSegment.voiceoverText;
          ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
          const textMetrics = ctx.measureText(subtitleText);
          const bgW = Math.min(width - 80, textMetrics.width + 48);
          const bgH = 50;
          const bgX = (width - bgW) / 2;
          const bgY = height - 90;

          // High contrast black pill with glowing emerald border
          ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, [10]);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(subtitleText, width / 2, bgY + bgH / 2, bgW - 30);
          ctx.restore();
        }

        if (elapsed < duration && !video.ended) {
          animationFrameId = requestAnimationFrame(renderFrame);
        } else {
          cancelAnimationFrame(animationFrameId);
          video.pause();
          if (onProgress) onProgress(100, 'Hoàn thành ghép nối! Đang đóng gói video có đầy đủ hình ảnh và tiếng...');
          setTimeout(() => {
            recorder.stop();
          }, 350);
        }
      };

      renderFrame();
    } catch (err) {
      reject(err);
    }
  });
}
