import { useEffect, useRef } from 'react';

interface ConvergenceChartProps {
  data: number[];
}

export function ConvergenceChart({ data }: ConvergenceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = 'hsl(210, 25%, 97%)';
    ctx.fillRect(0, 0, width, height);

    // Find min/max
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    // Draw grid
    ctx.strokeStyle = 'hsl(210, 20%, 88%)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'hsl(215, 15%, 45%)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = 'hsl(199, 89%, 48%)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((val, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + ((maxVal - val) / range) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = 'hsl(199, 89%, 48%)';
    data.forEach((val, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + ((maxVal - val) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = 'hsl(215, 15%, 45%)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // X axis label
    ctx.fillText('Iteración', width / 2, height - 5);
    
    // Y axis labels
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(maxVal)}m`, padding.left - 5, padding.top + 5);
    ctx.fillText(`${Math.round(minVal)}m`, padding.left - 5, height - padding.bottom);

    // Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = 'hsl(215, 25%, 15%)';
    ctx.fillText('Convergencia ACO', width / 2, 12);

  }, [data]);

  return (
    <div className="control-card">
      <canvas
        ref={canvasRef}
        id="convChart"
        className="w-full h-48 rounded-lg"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}
