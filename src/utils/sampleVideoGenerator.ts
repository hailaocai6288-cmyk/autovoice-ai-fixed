import { VideoSourceData } from '../types';

export async function generateSampleScreenRecording(
  topic = 'Hướng dẫn tạo Video tự động bằng AI trên Flow',
  onProgress?: (pct: number) => void
): Promise<VideoSourceData> {
  const width = 1280;
  const height = 720;
  const fps = 25;
  const totalDurationSec = 14;
  const totalFrames = totalDurationSec * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Không thể tạo canvas 2D');

  // MediaRecorder stream
  const stream = canvas.captureStream(fps);
  
  // Find supported mime type
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
  });

  recorder.start();

  // Helper bezier for smooth cursor paths
  const getCursorPath = (t: number) => {
    // t from 0 to 14
    if (t < 3.2) {
      // Move from center (640, 400) to top right button (1100, 110)
      const p = Math.min(1, Math.max(0, t / 3.0));
      const ease = p * p * (3 - 2 * p);
      return {
        x: 640 + (1100 - 640) * ease,
        y: 400 + (110 - 400) * ease,
        clicked: t >= 3.0 && t <= 3.4,
      };
    } else if (t < 5.0) {
      // Move to prompt input box (640, 290)
      const p = Math.min(1, Math.max(0, (t - 3.4) / 1.4));
      const ease = p * p * (3 - 2 * p);
      return {
        x: 1100 + (640 - 1100) * ease,
        y: 110 + (290 - 110) * ease,
        clicked: t >= 4.7 && t <= 5.1,
      };
    } else if (t < 8.5) {
      // Typing prompt box - slight cursor hover around (640, 290)
      return {
        x: 640 + Math.sin(t * 2) * 5,
        y: 290 + Math.cos(t * 2) * 3,
        clicked: false,
      };
    } else if (t < 11.0) {
      // Move down to voice dropdown (640, 430)
      const p = Math.min(1, Math.max(0, (t - 8.5) / 2.0));
      const ease = p * p * (3 - 2 * p);
      return {
        x: 640 + (640 - 640) * ease,
        y: 290 + (430 - 290) * ease,
        clicked: t >= 10.3 && t <= 10.8,
      };
    } else {
      // Move to render button (1000, 580)
      const p = Math.min(1, Math.max(0, (t - 11.0) / 2.0));
      const ease = p * p * (3 - 2 * p);
      return {
        x: 640 + (1000 - 640) * ease,
        y: 430 + (580 - 430) * ease,
        clicked: t >= 12.8 && t <= 13.4,
      };
    }
  };

  // Render loop
  for (let frame = 0; frame < totalFrames; frame++) {
    const timeSec = frame / fps;
    const cur = getCursorPath(timeSec);

    // 1. Draw UI Screen Background (Dark Camtasia / Flow Studio theme)
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Top Navigation Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, 64);
    
    // Logo & Brand
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(40, 32, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FLOW STUDIO AI', 66, 38);

    // Breadcrumb / Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Dự Án / ' + topic, 260, 37);

    // Top Right Action Button: "Tạo Video Mới"
    const isOverCreateBtn = cur.x >= 1020 && cur.x <= 1200 && cur.y >= 15 && cur.y <= 55;
    ctx.fillStyle = isOverCreateBtn ? '#10b981' : '#059669';
    ctx.beginPath();
    ctx.roundRect(1020, 16, 180, 34, [6]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('+ Tạo Video Mới', 1060, 38);

    // Left Sidebar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 64, 220, height - 64);
    const navItems = ['Trang chủ', 'Mẫu Video', 'Thư viện AI', 'Lồng tiếng Voice', 'Cài đặt'];
    navItems.forEach((item, idx) => {
      const itemY = 100 + idx * 46;
      if (idx === 1 && timeSec > 2.5) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(10, itemY - 24, 200, 36);
      }
      ctx.fillStyle = idx === 1 ? '#38bdf8' : '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(item, 40, itemY);
    });

    // Main Workspace Canvas Area
    ctx.fillStyle = '#090d16';
    ctx.fillRect(230, 74, width - 240, height - 84);

    // Center Dialog / Modal (appears after 3.2s when button is clicked)
    if (timeSec >= 3.2) {
      const modalAlpha = Math.min(1, (timeSec - 3.2) * 3);
      ctx.save();
      ctx.globalAlpha = modalAlpha;

      // Backdrop
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(230, 74, width - 240, height - 84);

      // Modal Window
      const mx = 420;
      const my = 140;
      const mw = 680;
      const mh = 480;

      ctx.fillStyle = '#1e293b';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, [12]);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Modal Header
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, 56, [12, 12, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Cấu Hình Kịch Bản Video Bằng AI', mx + 24, my + 34);

      // Modal Form - Input Prompt
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Chủ đề kịch bản & Lời thoại:', mx + 24, my + 90);

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx + 24, my + 104, mw - 48, 80, [8]);
      ctx.fill();
      ctx.stroke();

      // Typing animation
      const fullPrompt = 'Hướng dẫn tạo video AI tự động trên phần mềm Flow với thao tác chuột.';
      let typedChars = 0;
      if (timeSec >= 5.0) {
        typedChars = Math.min(fullPrompt.length, Math.floor((timeSec - 5.0) * 15));
      }
      ctx.fillStyle = '#f8fafc';
      ctx.font = '14px sans-serif';
      const promptToShow = fullPrompt.substring(0, typedChars);
      ctx.fillText(promptToShow, mx + 40, my + 140);
      if (timeSec >= 5.0 && timeSec < 9.0 && Math.floor(timeSec * 4) % 2 === 0) {
        const textWidth = ctx.measureText(promptToShow).width;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(mx + 42 + textWidth, my + 126, 2, 18);
      }

      // Voice selection dropdown
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Giọng đọc thuyết minh:', mx + 24, my + 215);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(mx + 24, my + 228, mw - 48, 44, [8]);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(
        timeSec > 10.5 ? '✓ Giọng AI Tiếng Việt - Nữ Truyền Cảm (Kore)' : 'Chọn giọng đọc...',
        mx + 40,
        my + 255
      );

      // Quality setting
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Chế độ phân giải:', mx + 24, my + 300);
      ctx.fillStyle = '#10b981';
      ctx.fillText('1080p 60FPS (Khuyên dùng)', mx + 160, my + 300);

      // Render button
      const isRenderBtnHover = cur.x >= mx + mw - 220 && cur.x <= mx + mw - 24 && cur.y >= my + mh - 60;
      ctx.fillStyle = isRenderBtnHover ? '#2563eb' : '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(mx + mw - 220, my + mh - 60, 196, 42, [8]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(timeSec > 13.0 ? '✓ Đang xuất bản...' : 'Bắt Đầu Render Video', mx + mw - 198, my + mh - 34);

      // Progress bar if render clicked
      if (timeSec >= 13.0) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(mx + 24, my + mh - 12, (mw - 48) * Math.min(1, (timeSec - 13.0) / 1.0), 4);
      }

      ctx.restore();
    }

    // 2. Camtasia Yellow Click Ripple & Cursor Spotlight
    if (cur.clicked) {
      // Draw Camtasia click pulse
      const rippleRadius = 26 + (Math.sin(timeSec * 30) + 1) * 6;
      ctx.strokeStyle = '#eab308'; // Camtasia Yellow
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, rippleRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Camtasia Mouse Pointer Arrow
    ctx.save();
    ctx.translate(cur.x, cur.y);
    // Draw mouse arrow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 19);
    ctx.lineTo(4.5, 14.5);
    ctx.lineTo(9.5, 23.5);
    ctx.lineTo(12.5, 22);
    ctx.lineTo(7.5, 13);
    ctx.lineTo(14, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Call onProgress occasionally
    if (frame % 30 === 0 && onProgress) {
      onProgress(Math.round((frame / totalFrames) * 100));
    }

    // Yield slight time to browser loop every few frames
    if (frame % 20 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  recorder.stop();
  const videoBlob = await recordingPromise;
  const url = URL.createObjectURL(videoBlob);

  return {
    url,
    name: 'Camtasia_Demo_Flow_Tutorial.mp4',
    duration: totalDurationSec,
    width,
    height,
    isSample: true,
  };
}
