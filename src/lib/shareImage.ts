import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const W = 1080;
const H = 1920;

interface ShareImageData {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  recommendedSize: string;
  fitPreference: string;
}

const MEASUREMENT_POSITIONS: { key: string; label: string; y: number; side: 'left' | 'right' }[] = [
  { key: 'shoulder', label: 'SHOULDER', y: 420, side: 'right' },
  { key: 'chest', label: 'CHEST', y: 540, side: 'left' },
  { key: 'bust', label: 'BUST', y: 620, side: 'right' },
  { key: 'waist', label: 'WAIST', y: 780, side: 'right' },
  { key: 'hips', label: 'HIPS', y: 940, side: 'right' },
  { key: 'inseam', label: 'INSEAM', y: 1260, side: 'left' },
];

function fmt(r: MeasurementRange): string {
  return `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
}
function fmtIn(r: MeasurementRange): string {
  return `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
}

export async function generateShareImage(data: ShareImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1A1A1A');
  grad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#B8960C';
  ctx.font = 'bold 48px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN RESULTS', W / 2, 100);

  // Subtle center line for body silhouette area
  ctx.strokeStyle = 'rgba(184, 150, 12, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 160);
  ctx.lineTo(W / 2, 1400);
  ctx.stroke();

  // Draw body silhouette outline (simplified stylized shape)
  drawSilhouette(ctx);

  // Height indicator
  ctx.textAlign = 'left';
  ctx.fillStyle = '#B8960C';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillText('HEIGHT', 60, 370);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Inter, system-ui, sans-serif';
  ctx.fillText(`${(data.heightCm * CM_TO_IN).toFixed(1)} in`, 60, 400);
  ctx.fillStyle = '#999999';
  ctx.font = '22px Inter, system-ui, sans-serif';
  ctx.fillText(`${data.heightCm.toFixed(0)} cm`, 60, 428);

  // Measurement labels with leader lines
  for (const pos of MEASUREMENT_POSITIONS) {
    const m = data.measurements[pos.key];
    if (!m) continue;

    const labelX = pos.side === 'left' ? 60 : W - 60;
    const bodyEdge = pos.side === 'left' ? 360 : 720;

    // Leader line
    ctx.strokeStyle = 'rgba(184, 150, 12, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(labelX + (pos.side === 'left' ? 180 : -180), pos.y + 8);
    ctx.lineTo(bodyEdge, pos.y + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dots at endpoints
    ctx.fillStyle = '#B8960C';
    ctx.beginPath();
    ctx.arc(bodyEdge, pos.y + 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.textAlign = pos.side === 'left' ? 'left' : 'right';
    ctx.fillStyle = '#B8960C';
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillText(pos.label, labelX, pos.y);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText(fmtIn(m), labelX, pos.y + 30);
    ctx.fillStyle = '#888888';
    ctx.font = '20px Inter, system-ui, sans-serif';
    ctx.fillText(fmt(m), labelX, pos.y + 56);
  }

  // Fit Identity card
  const cardY = 1460;
  ctx.fillStyle = 'rgba(184, 150, 12, 0.08)';
  roundRect(ctx, 80, cardY, W - 160, 120, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(184, 150, 12, 0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, 80, cardY, W - 160, 120, 20);
  ctx.stroke();

  const items = [
    { label: 'SIZE', value: data.recommendedSize },
    { label: 'FIT', value: data.fitPreference.charAt(0).toUpperCase() + data.fitPreference.slice(1) },
    { label: 'HEIGHT', value: `${data.heightCm}cm` },
  ];
  const colW = (W - 160) / items.length;
  items.forEach((item, i) => {
    const cx = 80 + colW * i + colW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#999999';
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillText(item.label, cx, cardY + 45);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    ctx.fillText(item.value, cx, cardY + 90);
  });

  // Crown logo watermark
  drawCrown(ctx, W - 120, H - 200, 60);

  // DRIPFITCHECK wordmark
  ctx.textAlign = 'right';
  ctx.fillStyle = '#B8960C';
  ctx.font = 'bold 32px Inter, system-ui, sans-serif';
  ctx.fillText('DRIPFITCHECK', W - 60, H - 130);

  // CTA at bottom
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666666';
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.fillText('Get your exact measurements at dripfitcheck.lovable.app', W / 2, H - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function drawSilhouette(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(184, 150, 12, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Head
  ctx.arc(W / 2, 250, 50, 0, Math.PI * 2);
  ctx.stroke();
  // Neck
  ctx.beginPath();
  ctx.moveTo(W / 2 - 20, 300);
  ctx.lineTo(W / 2 - 20, 340);
  ctx.moveTo(W / 2 + 20, 300);
  ctx.lineTo(W / 2 + 20, 340);
  ctx.stroke();
  // Torso
  ctx.beginPath();
  ctx.moveTo(W / 2 - 20, 340);
  ctx.lineTo(W / 2 - 150, 380); // shoulders
  ctx.lineTo(W / 2 - 160, 550); // chest to waist
  ctx.lineTo(W / 2 - 120, 750); // waist
  ctx.lineTo(W / 2 - 170, 950); // hips
  ctx.lineTo(W / 2 - 100, 1400); // leg
  ctx.moveTo(W / 2 + 20, 340);
  ctx.lineTo(W / 2 + 150, 380);
  ctx.lineTo(W / 2 + 160, 550);
  ctx.lineTo(W / 2 + 120, 750);
  ctx.lineTo(W / 2 + 170, 950);
  ctx.lineTo(W / 2 + 100, 1400);
  ctx.stroke();
  // Arms
  ctx.beginPath();
  ctx.moveTo(W / 2 - 150, 380);
  ctx.lineTo(W / 2 - 220, 700);
  ctx.moveTo(W / 2 + 150, 380);
  ctx.lineTo(W / 2 + 220, 700);
  ctx.stroke();
}

function drawCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.fillStyle = '#B8960C';
  ctx.beginPath();
  const s = size;
  ctx.moveTo(cx - s / 2, cy + s / 4);
  ctx.lineTo(cx - s / 2, cy - s / 6);
  ctx.lineTo(cx - s / 4, cy);
  ctx.lineTo(cx, cy - s / 3);
  ctx.lineTo(cx + s / 4, cy);
  ctx.lineTo(cx + s / 2, cy - s / 6);
  ctx.lineTo(cx + s / 2, cy + s / 4);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
