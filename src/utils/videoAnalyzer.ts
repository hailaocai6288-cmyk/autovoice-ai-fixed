import { ActionType, DetectedMoment } from '../types';

export interface AnalysisProgressCallback {
  (progress: number, status: string): void;
}

export function formatTimeDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export async function analyzeVideoFrames(
  videoUrl: string,
  onProgress?: AnalysisProgressCallback
): Promise<DetectedMoment[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 10;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        // Downscale for faster pixel analysis
        const sampleW = 320;
        const sampleH = 180;
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Không thể khởi tạo Canvas 2D');
        }

        // Sampling interval: every 0.6 seconds or adaptive to get between 10-25 samples
        const sampleInterval = Math.max(0.5, Math.min(1.2, duration / 20));
        const sampleTimes: number[] = [];
        for (let t = 0.2; t < duration; t += sampleInterval) {
          sampleTimes.push(t);
        }

        const detectedMoments: DetectedMoment[] = [];
        let prevImageData: ImageData | null = null;
        let lastCursorX = 50;
        let lastCursorY = 50;

        for (let i = 0; i < sampleTimes.length; i++) {
          const t = sampleTimes[i];
          const pct = Math.round(((i + 1) / sampleTimes.length) * 100);
          if (onProgress) {
            onProgress(pct, `Đang quét khung hình tại giây ${t.toFixed(1)}s / ${duration.toFixed(1)}s...`);
          }

          // Seek video
          await new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              res();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = t;
          });

          // Draw current frame
          ctx.drawImage(video, 0, 0, sampleW, sampleH);
          const currentImageData = ctx.getImageData(0, 0, sampleW, sampleH);

          // Thumbnail capture
          const frameThumbnail = canvas.toDataURL('image/jpeg', 0.65);

          // Optical differential analysis to detect cursor & action hotspot
          let deltaSum = 0;
          let maxDeltaRegion = { x: sampleW / 2, y: sampleH / 2, maxDelta: 0 };
          let yellowColorCount = 0; // Check for Camtasia click rings (yellow/gold RGB)
          let yellowXSum = 0;
          let yellowYSum = 0;

          if (prevImageData) {
            const data1 = prevImageData.data;
            const data2 = currentImageData.data;
            const blockStep = 4; // Check every 4th pixel for speed

            for (let y = 0; y < sampleH; y += blockStep) {
              for (let x = 0; x < sampleW; x += blockStep) {
                const idx = (y * sampleW + x) * 4;
                const r1 = data1[idx];
                const g1 = data1[idx + 1];
                const b1 = data1[idx + 2];

                const r2 = data2[idx];
                const g2 = data2[idx + 1];
                const b2 = data2[idx + 2];

                const diff = Math.abs(r2 - r1) + Math.abs(g2 - g1) + Math.abs(b2 - b1);
                deltaSum += diff;

                if (diff > maxDeltaRegion.maxDelta) {
                  maxDeltaRegion.maxDelta = diff;
                  maxDeltaRegion.x = x;
                  maxDeltaRegion.y = y;
                }

                // Detect Camtasia Yellow Click Ripple (#eab308 / #facc15: high R & G, low B)
                if (r2 > 200 && g2 > 160 && b2 < 80) {
                  yellowColorCount++;
                  yellowXSum += x;
                  yellowYSum += y;
                }
              }
            }
          }

          // Calculate visual change score (0-100)
          const totalPixels = (sampleW * sampleH) / 16;
          const avgDelta = deltaSum / (totalPixels || 1);
          const visualScore = Math.min(100, Math.round(avgDelta / 2));

          // Determine cursor coordinates
          let cursorX = lastCursorX;
          let cursorY = lastCursorY;

          if (yellowColorCount > 8) {
            // Strong yellow Camtasia click ripple detected
            cursorX = Math.round((yellowXSum / yellowColorCount / sampleW) * 100);
            cursorY = Math.round((yellowYSum / yellowColorCount / sampleH) * 100);
          } else if (maxDeltaRegion.maxDelta > 120) {
            cursorX = Math.round((maxDeltaRegion.x / sampleW) * 100);
            cursorY = Math.round((maxDeltaRegion.y / sampleH) * 100);
          } else {
            // Subtle movement drift
            cursorX = Math.max(5, Math.min(95, lastCursorX + (Math.sin(t) * 4)));
            cursorY = Math.max(5, Math.min(95, lastCursorY + (Math.cos(t) * 3)));
          }

          lastCursorX = cursorX;
          lastCursorY = cursorY;

          // Categorize Action Type
          let actionType: ActionType = 'HOVER';
          let actionLabel = `Di chuyển con trỏ chuột tới khu vực (${cursorX}%, ${cursorY}%)`;

          const isClick = yellowColorCount > 8 || (visualScore > 20 && maxDeltaRegion.maxDelta > 180);

          if (isClick) {
            actionType = 'CLICK';
            if (cursorY < 20) {
              actionLabel = `Nhấp chuột vào thanh điều khiển / Menu trên cùng (${cursorX}%, ${cursorY}%)`;
            } else if (cursorY > 75) {
              actionLabel = `Nhấp chuột vào ô nhập lệnh (Prompt) / Nút hành động phía dưới (${cursorX}%, ${cursorY}%)`;
            } else if (cursorX > 70 && cursorY < 40) {
              actionLabel = `Nhấp chuột vào nút Tạo / Xuất bản góc trên phải (${cursorX}%, ${cursorY}%)`;
            } else {
              actionLabel = `Nhấp chuột (Click) chọn mục trên màn hình tại (${cursorX}%, ${cursorY}%)`;
            }
          } else if (visualScore > 40) {
            actionType = 'MENU_OPEN';
            actionLabel = 'Chuyển đổi giao diện / Hộp thoại chọn tệp hoặc phân cảnh mới xuất hiện';
          } else if (visualScore > 15 && cursorY > 65) {
            actionType = 'TYPE_INPUT';
            actionLabel = 'Nhập văn bản / Tương tác ô nhập câu lệnh (Prompt)';
          } else if (visualScore > 8) {
            actionType = 'DRAG_MOVE';
            actionLabel = `Rê chuột chọn nội dung / Kéo thả đối tượng (${cursorX}%, ${cursorY}%)`;
          }

          detectedMoments.push({
            id: `moment-${i + 1}`,
            timestamp: Number(t.toFixed(2)),
            timestampDisplay: formatTimeDisplay(t),
            cursorX,
            cursorY,
            actionType,
            actionLabel,
            visualChangeScore: visualScore,
            frameThumbnail,
          });

          prevImageData = currentImageData;
        }

        if (onProgress) {
          onProgress(100, `Hoàn thành phân tích! Phát hiện ${detectedMoments.length} điểm thao tác chính.`);
        }

        resolve(detectedMoments);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error('Không thể tải video để phân tích'));
    };
  });
}
