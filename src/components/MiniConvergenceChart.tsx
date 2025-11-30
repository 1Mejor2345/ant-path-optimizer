import { useMemo } from 'react';

interface MiniConvergenceChartProps {
  data: number[];
  width?: number;
  height?: number;
}

export function MiniConvergenceChart({ 
  data, 
  width = 280, 
  height = 100 
}: MiniConvergenceChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: '', minY: 0, maxY: 100 };
    
    const minY = Math.min(...data) * 0.95;
    const maxY = Math.max(...data) * 1.05;
    const range = maxY - minY || 1;
    
    const padding = 5;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minY) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
    
    // Area fill path
    const firstX = padding;
    const lastX = padding + chartWidth;
    const bottomY = height - padding;
    const areaPath = `M ${firstX},${bottomY} L ${data.map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minY) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' L ')} L ${lastX},${bottomY} Z`;
    
    return { points, areaPath, minY, maxY };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/30 rounded-lg border border-border/50"
        style={{ width, height }}
      >
        <p className="text-xs text-muted-foreground">Esperando datos...</p>
      </div>
    );
  }

  const currentValue = data[data.length - 1];
  const improvement = data.length > 1 ? ((data[0] - currentValue) / data[0] * 100) : 0;

  return (
    <div className="bg-card/50 rounded-lg border border-border/50 p-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-medium text-muted-foreground">Convergencia ACO</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-secondary">
            {Math.round(currentValue)}m
          </span>
          {improvement > 0 && (
            <span className="text-[9px] text-secondary">
              ↓{improvement.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible"
      >
        {/* Grid lines */}
        <line 
          x1="5" y1={height - 5} 
          x2={width - 5} y2={height - 5} 
          stroke="hsl(var(--border))" 
          strokeWidth="0.5"
        />
        <line 
          x1="5" y1="5" 
          x2="5" y2={height - 5} 
          stroke="hsl(var(--border))" 
          strokeWidth="0.5"
        />
        
        {/* Area fill */}
        <path
          d={chartData.areaPath}
          fill="hsl(var(--secondary) / 0.2)"
        />
        
        {/* Line */}
        <polyline
          points={chartData.points}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current point */}
        {data.length > 0 && (
          <circle
            cx={width - 5}
            cy={5 + (height - 10) - ((currentValue - chartData.minY) / (chartData.maxY - chartData.minY || 1)) * (height - 10)}
            r="3"
            fill="hsl(var(--secondary))"
          />
        )}
      </svg>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
        <span>Iter 1</span>
        <span>Iter {data.length}</span>
      </div>
    </div>
  );
}
