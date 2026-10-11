import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Support larger payload for frame analysis (up to 50mb)
app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Step 3: AI Scriptwriting based on Video & Cursor analysis
app.post('/api/analyze-and-script', async (req, res) => {
  try {
    const {
      topic = 'Hướng dẫn thao tác phần mềm',
      duration = 15,
      language = 'vi', // 'vi' or 'en'
      tone = 'Chuyên nghiệp, truyền cảm và rõ ràng',
      voiceGender = 'Nam',
      targetAudience = 'Người xem hướng dẫn, kỹ thuật viên',
      detectedMoments = [],
      sampleFrames = [], // array of { timestamp: number, imageBase64: string, actionLabel?: string }
    } = req.body;

    if (!ai) {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ.',
      });
    }

    const isEnglish = language === 'en';

    const promptText = isEnglish
      ? `
You are a master Software Screencast Director and Voiceover Narrator specializing in Camtasia screen recording tutorials.

VIDEO SPECIFICATIONS:
- Topic / Title: "${topic}"
- Total Video Duration: ${duration.toFixed(1)} seconds
- Target Voice: ${voiceGender} (${tone})
- Target Audience: ${targetAudience}
- Language: ENGLISH

IMPORTANT INSTRUCTIONS (CRITICAL REQUIREMENTS):
1. **EXACT VISUAL & CURSOR FIDELITY**:
   - Carefully inspect every attached keyframe image in chronological order.
   - Accurately describe the actual software and UI shown:
     * When the browser opens and navigates to a site (e.g., flow.google.com), narrate opening the browser and visiting the platform.
     * When a File Explorer / Open file dialog appears, narrate selecting the image file (e.g. MEO.png) and clicking Open.
     * When switching to Microsoft Word or text document to copy a prompt, narrate copying the sample prompt text.
     * When entering/pasting the prompt and configuring video settings, describe that exact action.
     * When the system renders the scene cards, explain the generated clips and scenes.
     * When the user clicks Preview or Export, describe previewing the full video and exporting the finished video.
   - DO NOT hallucinate unrelated features (e.g., do not talk about aspect ratios when an open-file dialog is visible!).

2. **CONTINUOUS NARRATION (ZERO DEAD GAPS)**:
   - Provide seamless, continuous voiceover coverage from second 0.0 to the final second ${duration.toFixed(1)}s.
   - Do NOT leave gaps with silence longer than 1-2 seconds.
   - Segment n+1 must start immediately after segment n finishes.
   - Generate approximately ${Math.max(6, Math.floor(duration / 10))} to ${Math.max(12, Math.floor(duration / 6))} detailed segments.

4. **WORD BUDGET**: each segment must have at most (endTime - startTime) x 2.8 English words so the narration never overlaps the next segment. voiceoverText must contain only spoken words, no stage directions or <tags>.

Output strictly matching the JSON schema.
`
      : `
Bạn là Đạo diễn kiêm Biên kịch lồng tiếng video hướng dẫn thao tác phần mềm chuyên nghiệp (chuyên lồng tiếng cho các video quay màn hình Camtasia).

THÔNG TIN VIDEO:
- Chủ đề / Tiêu đề: "${topic}"
- Tổng thời lượng video: ${duration.toFixed(1)} giây
- Giọng đọc định hướng: ${voiceGender} (${tone})
- Đối tượng người xem: ${targetAudience}
- Ngôn ngữ: TIẾNG VIỆT

QUY TẮC BẮT BUỘC (RẤT QUAN TRỌNG - BÁM SÁT THAO TÁC THỰC TẾ & KHÔNG ĐỂ KHOẢNG LẶNG):

1. **BÁM SÁT 100% CÁC HÌNH ẢNH KHUNG HÌNH (FRAMES) VÀ THAO TÁC CHUỘT THỰC TẾ**:
   - Hãy quan sát kỹ từng hình ảnh khung hình thực tế gửi kèm theo mốc thời gian (timestamp).
   - Nhận diện chính xác phần mềm, cửa sổ và giao diện tại từng thời điểm:
     * Khi mở trình duyệt (Cốc Cốc, Chrome) truy cập web (flow.google.com) -> thuyết minh đúng thao tác mở trình duyệt và vào trang chủ.
     * Khi mở hộp thoại Chọn tệp / Open File (chọn ảnh như MEO.png) -> thuyết minh đúng thao tác bấm tải ảnh lên và chọn file ảnh từ máy tính.
     * Khi chuyển cửa sổ sang Microsoft Word/Notepad để bôi đen sao chép câu lệnh (prompt) -> thuyết minh đúng thao tác sao chép câu lệnh prompt mẫu từ tài liệu.
     * Khi dán câu lệnh prompt vào ô nhập trên giao diện web -> thuyết minh thao tác dán prompt và thiết lập thông số.
     * Khi AI đang sinh các phân cảnh video (các cảnh video nhảy múa của chú mèo) -> thuyết minh về các phân cảnh đang được xử lý và hiển thị trên màn hình.
     * Khi bấm nút Xem trước toàn bộ video hoặc bấm Xuất/Tải video hoàn tất -> thuyết minh đúng thao tác xem trước và xuất file video.
   - TUYỆT ĐỐI KHÔNG thuyết minh lạc đề (ví dụ: đang mở hộp thoại chọn file ảnh thì không được nói sang chọn tỉ lệ khung hình hay hoạt họa).

2. **KHÔNG ĐƯỢC BỎ BẤT KỲ KHOẢNG NÀO (PHỦ KÍN TOÀN BỘ THỜI GIAN, ZERO DEAD SILENCE)**:
   - Kịch bản lồng tiếng phải **PHỦ KÍN TOÀN BỘ VIDEO TỪ GIÂY 0.0 ĐẾN GIÂY CUỐI CÙNG ${duration.toFixed(1)}s**.
   - TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ KHOẢNG LẶNG (DEAD SILENCE) DÀI QUÁ 1-2 GIÂY.
   - Phân đoạn tiếp theo phải bắt đầu ngay sau phân đoạn trước (startTime[n+1] ≈ endTime[n]).
   - Khi màn hình đang load hoặc chờ AI sinh video, người thuyết minh phải hướng dẫn người xem quan sát thanh tiến trình hoặc giải thích các tính năng, giữ cho video luôn có tiếng nói truyền cảm, cuốn hút.

3. **MẬT ĐỘ PHÂN ĐOẠN ĐỦ CHI TIẾT**:
   - Với video dài ${duration.toFixed(1)} giây: Hãy chia thành khoảng ${Math.max(6, Math.floor(duration / 10))} đến ${Math.max(12, Math.floor(duration / 6))} phân đoạn ngắn (mỗi đoạn 5 - 12 giây) để khớp chuẩn xác từng cử động chuột.

4. **SỐ TỪ PHẢI VỪA KHÍT THỜI LƯỢNG ĐOẠN**: mỗi đoạn tối đa khoảng (endTime - startTime) × 2.5 từ tiếng Việt. Lời quá dài sẽ bị đọc chồng lên đoạn sau. Không viết thẻ <...> hay chú thích sân khấu trong voiceoverText, chỉ viết đúng lời sẽ đọc.

Hãy trả về toàn bộ kết quả theo đúng cấu trúc JSON đã yêu cầu.
`;

    // Build multimodal contents with evenly distributed keyframes
    const contents: any[] = [];
    
    // Add sample frames with timestamp markers
    if (Array.isArray(sampleFrames) && sampleFrames.length > 0) {
      // Support up to 12 keyframes distributed across the video timeline
      const framesToInclude = sampleFrames.slice(0, 12);
      for (let idx = 0; idx < framesToInclude.length; idx++) {
        const frame = framesToInclude[idx];
        if (frame.imageBase64) {
          const cleanBase64 = frame.imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const frameTime = frame.timestamp !== undefined ? Number(frame.timestamp).toFixed(1) : (idx * (duration / framesToInclude.length)).toFixed(1);
          contents.push({
            text: `[ẢNH CHỤP MÀN HÌNH TẠI GIÂY ${frameTime}s]: Quan sát giao diện và hành động chuột tại thời điểm này:`
          });
          contents.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          });
        }
      }
    }

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề video hoàn chỉnh' },
            summary: { type: Type.STRING, description: 'Tóm tắt nội dung hướng dẫn' },
            estimatedSpeed: { type: Type.STRING, description: 'Tốc độ giọng đọc gợi ý (ví dụ: 1.0x)' },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  startTime: { type: Type.NUMBER },
                  endTime: { type: Type.NUMBER },
                  action: { type: Type.STRING },
                  cursorPosition: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                    },
                    required: ['x', 'y'],
                  },
                  voiceoverText: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                  calloutText: { type: Type.STRING },
                },
                required: ['id', 'startTime', 'endTime', 'action', 'cursorPosition', 'voiceoverText', 'emotion'],
              },
            },
          },
          required: ['title', 'summary', 'segments'],
        },
      },
    });

    const textOutput = response.text || '{}';
    const parsedData = JSON.parse(textOutput);
    parsedData.language = language;

    // Post-process segments to GUARANTEE seamless timeline coverage (ZERO DEAD GAPS)
    if (Array.isArray(parsedData.segments) && parsedData.segments.length > 0) {
      // Sort chronologically
      parsedData.segments.sort((a: any, b: any) => a.startTime - b.startTime);

      // Force first segment to start at 0.0s
      if (parsedData.segments[0].startTime > 0.5) {
        parsedData.segments[0].startTime = 0.0;
      }

      // Close all interior gaps between segments
      for (let i = 0; i < parsedData.segments.length - 1; i++) {
        const curr = parsedData.segments[i];
        const next = parsedData.segments[i + 1];

        // If there's an unnatural gap > 1s, close it by stretching or aligning
        if (next.startTime > curr.endTime + 0.5) {
          curr.endTime = Number((next.startTime - 0.2).toFixed(1));
        } else if (curr.endTime > next.startTime) {
          curr.endTime = Number(Math.max(curr.startTime + 0.5, next.startTime - 0.2).toFixed(1));
        }
      }

      // Ensure last segment covers up to the end of the video
      const lastSeg = parsedData.segments[parsedData.segments.length - 1];
      if (lastSeg.endTime < duration - 2.0) {
        lastSeg.endTime = Number(duration.toFixed(1));
      }
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error('Error in analyze-and-script:', err);
    res.status(500).json({
      error: 'Không thể tạo kịch bản từ Gemini: ' + (err.message || 'Lỗi không xác định'),
    });
  }
});

// ---------------------------------------------------------------------------
// Step 4: TTS Generation  (Gemini 3.8 TTS dùng INTERACTIONS API, không phải generateContent)
// ---------------------------------------------------------------------------
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];

// [SỬA LỖI ĐỔI GIỌNG] Mỗi model TTS có âm sắc khác nhau. Trước đây khi model đầu bị 429/503
// thì tự nhảy sang model khác giữa chừng -> giọng đổi giữa các đoạn. Giờ "khóa" model đã chạy
// thành công và dùng lại cho mọi đoạn sau; chỉ chuyển model khi model đó thật sự hỏng (404/400).
let stickyModel: string | null = null;
function orderedModels(): string[] {
  return stickyModel ? [stickyModel, ...TTS_MODELS.filter((m) => m !== stickyModel)] : TTS_MODELS;
}

// [SỬA LỖI ĐỔI GIỌNG] Gemini TTS không có giọng Bắc/Nam cố định -> nếu không chỉ định vùng miền,
// mỗi lần gọi nó tự đoán và giọng bị lúc Bắc lúc Nam. Luôn gắn 1 vùng miền cố định cho mọi đoạn.
// Đổi mặc định sang giọng Nam: thay 'bac' thành 'nam' ở dòng dưới.
const DEFAULT_VI_ACCENT = 'bac';
const ACCENT_STYLE: Record<string, string> = {
  bac: 'Giọng miền Bắc chuẩn Hà Nội',
  nam: 'Giọng miền Nam chuẩn Sài Gòn',
  trung: 'Giọng miền Trung chuẩn Huế',
};

function buildStyle(style: string, language: string, accent?: string): string {
  let s = String(style || '').replace(/[:：]\s*$/, '').trim();
  if (language !== 'vi') return s.slice(0, 120);

  // Nếu style từ giao diện đã nêu rõ vùng miền thì giữ nguyên, không ghi đè.
  if (/miền\s*(bắc|nam|trung)|hà nội|sài gòn|huế/i.test(s)) return s.slice(0, 120);

  const key = accent && ACCENT_STYLE[accent] ? accent : DEFAULT_VI_ACCENT;
  const accentText = ACCENT_STYLE[key];
  // Đặt vùng miền lên đầu rồi mới cắt, để không bao giờ bị cắt mất.
  const rest = s.slice(0, Math.max(0, 120 - accentText.length - 2));
  return rest ? `${accentText}, ${rest}` : accentText;
}

function parseWav(buf: Buffer): { pcm: Buffer; sampleRate: number } {
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    let off = 12;
    let sampleRate = 24000;
    while (off + 8 <= buf.length) {
      const id = buf.toString('ascii', off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === 'fmt ') sampleRate = buf.readUInt32LE(off + 12);
      if (id === 'data') return { pcm: buf.subarray(off + 8, Math.min(buf.length, off + 8 + size)), sampleRate };
      off += 8 + size + (size % 2);
    }
  }
  return { pcm: buf, sampleRate: 24000 }; // không có header -> coi là PCM 16-bit mono 24kHz
}

function wrapWav(pcm: Buffer, sampleRate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'ascii');
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8, 'ascii');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36, 'ascii');
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Gemini TTS đôi khi gắn ~0.15s tạp âm "soẹt" (rất to, nhiều cao tần) ở cuối clip -> cắt bỏ.
function cleanTail(pcmBuf: Buffer, sr: number): Buffer {
  const n16 = Math.floor(pcmBuf.length / 2);
  const a = new Int16Array(pcmBuf.buffer.slice(pcmBuf.byteOffset, pcmBuf.byteOffset + n16 * 2));
  const hop = Math.floor(sr * 0.01);
  const n = Math.floor(a.length / hop);
  if (n < 20) return pcmBuf;

  const rms = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let e = 0;
    for (let k = 0; k < hop; k++) e += a[f * hop + k] ** 2;
    rms[f] = Math.sqrt(e / hop);
  }
  const sorted = Array.from(rms).sort((x, y) => x - y);
  const p90 = sorted[Math.floor(n * 0.9)];
  if (p90 <= 0) return pcmBuf;
  const sil = (f: number) => rms[f] < 0.03 * p90;

  let i = n - 1;
  while (i >= 0 && sil(i)) i--;
  if (i < 0) return pcmBuf;
  const endRun = i;
  while (i >= 0 && !sil(i)) i--;
  const startRun = i + 1;
  let j = i;
  while (j >= 0 && sil(j)) j--;
  const gap = i - j;
  const runLen = (endRun - startRun + 1) * 0.01;
  if (j < 0 || gap < 4 || runLen > 0.4) return pcmBuf;

  // tỉ lệ cao tần (đạo hàm bậc 1 / năng lượng): tạp âm ~0.9, lời thường ~0.03-0.08
  let num = 0, den = 1e-9, meanRms = 0;
  for (let k = startRun * hop + 1; k < (endRun + 1) * hop; k++) {
    num += (a[k] - a[k - 1]) ** 2;
    den += a[k] ** 2;
  }
  for (let f = startRun; f <= endRun; f++) meanRms += rms[f];
  meanRms /= endRun - startRun + 1;
  if (!(num / den > 0.5 && meanRms >= 1.3 * p90)) return pcmBuf;

  const keepSamples = (j + 1 + Math.min(gap, 3)) * hop;
  const out = Int16Array.from(a.subarray(0, keepSamples));
  const fade = Math.min(out.length, Math.floor(sr * 0.03));
  for (let k = 0; k < fade; k++) out[out.length - fade + k] = Math.round(out[out.length - fade + k] * (1 - k / fade));
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

async function synthWithModel(model: string, text: string, voiceName: string, style: string): Promise<Buffer> {
  const textItem: any = { type: 'text', text };
  if (style) textItem.annotations = [{ type: 'speech_metadata', style }];

  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [{ type: 'user_input', content: [textItem] }],
      response_format: { type: 'audio' }, // unary -> WAV có header RIFF
      generation_config: { speech_config: [{ voice: voiceName }] },
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    const err: any = new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    err.status = r.status;
    throw err;
  }
  const json: any = await r.json();
  const audioBlocks = (json.steps || [])
    .flatMap((st: any) => st.content || [])
    .filter((c: any) => c.type === 'audio' && c.data);
  if (!audioBlocks.length) throw new Error('Mô hình không trả về dữ liệu âm thanh');
  return Buffer.from(audioBlocks[audioBlocks.length - 1].data, 'base64');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', language = 'vi', accent } = req.body;
    const { style: rawStyle = '' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Nội dung text không hợp lệ' });
    }
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY' });
    }

    // style phải NGẮN, luôn kèm vùng miền cố định để các đoạn không đổi giọng
    const style = buildStyle(rawStyle, language, accent);

    let lastErr: any = null;
    for (const model of orderedModels()) {
      // Thử lại NHIỀU lần trên cùng 1 model khi bị giới hạn tốc độ, thay vì nhảy sang model khác.
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const raw = await synthWithModel(model, text.trim(), voiceName, style);
          const { pcm, sampleRate } = parseWav(raw);
          const cleaned = cleanTail(pcm, sampleRate);
          const wav = wrapWav(cleaned, sampleRate);
          stickyModel = model; // khóa model này cho các đoạn sau
          return res.json({ audioData: wav.toString('base64'), mimeType: 'audio/wav', model });
        } catch (e: any) {
          lastErr = e;
          if (e.status === 429 || e.status === 503 || e.status === 500) {
            await sleep(Math.min(2500 * (attempt + 1), 8000)); // chạm giới hạn tốc độ -> chờ rồi thử lại
            continue;
          }
          if (stickyModel === model) stickyModel = null; // model hỏng thật (404/400...) -> bỏ khóa
          break; // sang model kế
        }
      }
    }
    throw lastErr || new Error('Không thể tạo âm thanh');
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Lỗi tổng hợp giọng nói: ' + (err.message || 'Không thể tạo âm thanh') });
  }
});

// Vite middleware in dev or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
