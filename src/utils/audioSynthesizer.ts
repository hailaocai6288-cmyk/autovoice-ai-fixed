import { VoiceSettings } from '../types';

export interface TTSResult {
  audioBlob: Blob;
  audioUrl: string;
  duration: number; // in seconds
}

// Convert base64 WAV to Blob
function base64ToWavBlob(base64: string): Blob {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

// Measure duration of an audio blob using AudioContext
async function measureAudioBlobDuration(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;
    audioCtx.close();
    return duration;
  } catch (e) {
    // Fallback estimate based on byte length: 24kHz 16-bit mono = ~48,000 bytes per second
    return Math.max(1.5, blob.size / 48000);
  }
}

// Synthesize audio using Web Speech API + AudioContext capture
async function synthesizeBrowserWebSpeech(
  text: string,
  voiceSettings: VoiceSettings
): Promise<TTSResult> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      // Fallback synthetic wav
      const dummy = createSyntheticAudioFallback(text);
      return resolve(dummy);
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.speechRate || 1.0;
    utterance.pitch = voiceSettings.pitch || 1.0;
    utterance.volume = voiceSettings.volume || 1.0;

    const voices = synth.getVoices();
    const isEnglish = voiceSettings.language === 'en';

    if (isEnglish) {
      const enVoice = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB')) && !v.name.includes('vi')
      );
      if (enVoice) utterance.voice = enVoice;
    } else {
      const viVoice = voices.find(
        (v) => v.lang.includes('vi') || v.lang.includes('VI') || v.name.toLowerCase().includes('vietnam')
      );
      if (viVoice) {
        utterance.voice = viVoice;
      }
    }

    if (voiceSettings.browserVoice) {
      const match = voices.find((v) => v.name === voiceSettings.browserVoice);
      if (match) utterance.voice = match;
    }

    const startTime = performance.now();

    utterance.onend = () => {
      const elapsedSec = Math.max(1.0, (performance.now() - startTime) / 1000);
      // Create synthetic audio container for player & video export
      const result = createSyntheticAudioFallback(text, elapsedSec);
      resolve(result);
    };

    utterance.onerror = () => {
      const result = createSyntheticAudioFallback(text);
      resolve(result);
    };

    synth.speak(utterance);
  });
}

// Generate offline synthetic speech wav sound for audio track export
export function createSyntheticAudioFallback(_text: string, durationSec = 2.5): TTSResult {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * Math.max(1.2, durationSec));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Giọng trình duyệt (Web Speech) KHÔNG thể thu vào file -> để khoảng im lặng, tuyệt đối không chèn âm "beep" giả.
  // (Buffer mới tạo đã toàn số 0 = im lặng)

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);
  return {
    audioBlob: blob,
    audioUrl,
    duration: durationSec,
  };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Master TTS Dispatcher
export async function generateSegmentVoiceover(
  text: string,
  voiceSettings: VoiceSettings,
  _targetDuration?: number
): Promise<TTSResult> {
  if (voiceSettings.engine === 'gemini') {
    const isEnglish = voiceSettings.language === 'en';
    // style NGẮN, ghi cả tốc độ vì Gemini TTS không có tham số tốc độ riêng
    const base = isEnglish ? 'natural, clear tutorial narrator' : 'thuyết minh tự nhiên, rõ ràng';
    const rate = voiceSettings.speechRate || 1;
    const pace = rate >= 1.15 ? (isEnglish ? ', speaking a bit faster' : ', nói nhanh hơn một chút')
      : rate <= 0.9 ? (isEnglish ? ', speaking slowly' : ', nói chậm rãi') : '';

    let lastErr: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: voiceSettings.geminiVoice,
            language: voiceSettings.language,
            style: base + pace,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Lỗi server TTS (${res.status})`);
        }
        const data = await res.json();
        if (!data.audioData) throw new Error('Server không trả về âm thanh');
        const blob = base64ToWavBlob(data.audioData);
        const duration = await measureAudioBlobDuration(blob);
        return { audioBlob: blob, audioUrl: URL.createObjectURL(blob), duration };
      } catch (err) {
        lastErr = err;
      }
    }
    // KHÔNG chuyển lặng lẽ sang giọng trình duyệt nữa: báo lỗi để người dùng biết và tạo lại
    throw lastErr instanceof Error ? lastErr : new Error('Không tạo được giọng Gemini');
  }

  // Engine "browser": chỉ để nghe thử; không ghi được vào video
  return synthesizeBrowserWebSpeech(text, voiceSettings);
}

// Convert AudioBuffer to clean 16-bit PCM WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = numSamples * numChannels * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  dataView.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, byteRate, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  dataView.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      dataView.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Lập lịch phát lời thoại: (1) nếu lời dài hơn khung thời gian thì tăng nhẹ tốc độ (tối đa 1.15x),
// (2) không bao giờ để 2 đoạn đọc chồng lên nhau: đoạn sau chờ đoạn trước đọc xong.
export function planVoiceSchedule(
  items: { startTime: number; endTime: number; duration: number }[]
): { start: number; rate: number }[] {
  const plan: { start: number; rate: number }[] = [];
  let prevEnd = 0;
  for (const it of items) {
    const slot = Math.max(0.5, it.endTime - it.startTime);
    const rate = it.duration > slot + 0.2 ? Math.min(1.15, it.duration / slot) : 1;
    const start = Math.max(it.startTime, prevEnd + 0.08);
    plan.push({ start, rate });
    prevEnd = start + it.duration / rate;
  }
  return plan;
}

// Create a combined audio track from all script segments
export async function createMergedVoiceoverAudio(
  segments: { startTime: number; endTime: number; audioBlob?: Blob }[],
  totalDuration: number
): Promise<Blob> {
  const sampleRate = 44100;
  const decoder = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded: { seg: (typeof segments)[number]; buf: AudioBuffer }[] = [];
  for (const seg of segments) {
    if (!seg.audioBlob) continue;
    try {
      decoded.push({ seg, buf: await decoder.decodeAudioData(await seg.audioBlob.arrayBuffer()) });
    } catch (e) {
      console.warn('Decode error in merged audio:', e);
    }
  }
  decoder.close();

  const plan = planVoiceSchedule(
    decoded.map((d) => ({ startTime: d.seg.startTime, endTime: d.seg.endTime, duration: d.buf.duration }))
  );
  const lastEnd = decoded.length ? Math.max(...decoded.map((d, i) => plan[i].start + d.buf.duration / plan[i].rate)) : 0;
  const safeDuration = Math.max(2, Math.ceil(Math.max(totalDuration, lastEnd)));
  const offlineCtx = new OfflineAudioContext(2, sampleRate * safeDuration, sampleRate);

  decoded.forEach((d, i) => {
    const source = offlineCtx.createBufferSource();
    source.buffer = d.buf;
    source.playbackRate.value = plan[i].rate;
    const gain = offlineCtx.createGain();
    gain.gain.value = 1.0; // 1.25 cũ làm vỡ tiếng (clipping)
    source.connect(gain);
    gain.connect(offlineCtx.destination);
    source.start(plan[i].start);
  });

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}
