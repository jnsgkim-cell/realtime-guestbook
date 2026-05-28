'use client';

import { useEffect, useRef, useState } from 'react';

interface DrawingCanvasProps {
  onChange: (value: string | null) => void;
}

const colors = ['#111827', '#ef4444', '#3b82f6', '#22c55e'];

export function DrawingCanvas({ onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState(colors[0]);
  const [lineWidth, setLineWidth] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setDrawing(true);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    setDrawing(false);
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null;
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={800}
        height={480}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-64 w-full rounded-3xl border-2 border-zinc-400 bg-white touch-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        {colors.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} className="h-8 w-8 rounded-full border-2" style={{ backgroundColor: c }} aria-label={c} />
        ))}
        <input type="range" min={2} max={18} value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
        <button type="button" onClick={clear} className="rounded-xl border px-3 py-1">전체 지우기</button>
      </div>
    </div>
  );
}
