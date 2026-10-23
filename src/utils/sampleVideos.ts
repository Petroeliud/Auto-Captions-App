// Utility for generating a fallback synthetic canvas test video stream if user requests test canvas
let cachedSyntheticUrl: string | null = null;

export function getSyntheticVideoUrl(): string {
  if (cachedSyntheticUrl) return cachedSyntheticUrl;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    let frame = 0;
    const totalFrames = 30 * 18; // 18 seconds at 30fps

    const drawFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const t = frame / 30;

      // Draw dynamic animated gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue1 = (frame * 2) % 360;
      const hue2 = (frame * 2 + 120) % 360;
      grad.addColorStop(0, `hsl(${hue1}, 70%, 20%)`);
      grad.addColorStop(1, `hsl(${hue2}, 70%, 10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw central badge
      ctx.fillStyle = 'rgba(18, 18, 23, 0.85)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.lineWidth = 4;
      const bw = 640;
      const bh = 180;
      const bx = (canvas.width - bw) / 2;
      const by = (canvas.height - bh) / 2 - 40;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAPCUT AUTO CAPTIONS', canvas.width / 2, by + 65);

      ctx.fillStyle = '#818CF8';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`TIMECODE: ${t.toFixed(2)}s / 18.00s`, canvas.width / 2, by + 120);

      frame++;
      setTimeout(drawFrame, 1000 / 30);
    };

    mediaRecorder.start();
    drawFrame();

    const dataUrl = canvas.toDataURL('image/png');
    cachedSyntheticUrl = dataUrl;

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      cachedSyntheticUrl = URL.createObjectURL(blob);
    };

    return cachedSyntheticUrl;
  } catch (err) {
    console.warn('Synthetic video generation skipped:', err);
    return '';
  }
}
