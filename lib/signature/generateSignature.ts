const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export function generateSignature(name: string): string {
  if (!name.trim()) {
    throw new Error('A non-empty name is required to generate a signature.');
  }

  const width = 420;
  const height = 120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to initialize canvas context for signature generation.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  const size = clamp(44 - Math.floor(name.length / 2), 26, 44);
  ctx.font = `italic ${size}px "Brush Script MT", "Segoe Script", "Comic Sans MS", cursive`;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 1.5;

  let cursorX = 18;
  const baselineY = 60;

  for (const char of name) {
    const jitterY = (Math.random() - 0.5) * 5;
    const angle = (Math.random() - 0.5) * 0.08;
    ctx.save();
    ctx.translate(cursorX, baselineY + jitterY);
    ctx.rotate(angle);
    ctx.fillText(char, 0, 0);
    const widthChar = Math.max(ctx.measureText(char).width, 8);
    cursorX += widthChar * 0.9;
    ctx.restore();
  }

  ctx.beginPath();
  ctx.moveTo(14, 88);
  ctx.bezierCurveTo(120, 104, 240, 78, 406, 90);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
