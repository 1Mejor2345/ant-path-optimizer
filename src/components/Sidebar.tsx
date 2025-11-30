import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Play, Pause, RotateCcw, Download, Eye, Footprints, 
  Zap, ChevronRight, FastForward, Settings, Activity
} from 'lucide-react';
import { predefinedPlaces, DEFAULT_ACO_PARAMS, DEFAULT_REQUEST_CONFIG, type PredefinedPlace } from '@/lib/maps-constants';
import { type LogEntry, type ACOMetrics } from '@/hooks/useACOSimulator';
import { type ProbabilityInfo } from '@/lib/aco-algorithm';

interface SidebarProps {
  onBuildMatrix: (start: PredefinedPlace, stops: PredefinedPlace[], delay: number, retries: number) => void;
  onRunACO: () => void;
  onAnimateACO: () => void;
  onShowBest: () => void;
  onTogglePause: () => void;
  onExport: () => void;
  onStepMode: (enabled: boolean) => void;
  onStepNext: () => void;
  onStepAuto: () => void;
  onStepReset: () => void;
  onRunNN: () => void;
  onRun2Opt: () => void;
  onParamsChange: (params: any) => void;
  onSpeedChange: (speed: number) => void;
  onShowFallbacksChange: (show: boolean) => void;
  isRunning: boolean;
  isPaused: boolean;
  isStepMode: boolean;
  logs: LogEntry[];
  metrics: ACOMetrics;
  progress: number;
  currentProbabilities: ProbabilityInfo[];
  nodeOrder: PredefinedPlace[];
}

export function Sidebar({
  onBuildMatrix,
  onRunACO,
  onAnimateACO,
  onShowBest,
  onTogglePause,
  onExport,
  onStepMode,
  onStepNext,
  onStepAuto,
  onStepReset,
  onRunNN,
  onRun2Opt,
  onParamsChange,
  onSpeedChange,
  onShowFallbacksChange,
  isRunning,
  isPaused,
  isStepMode,
  logs,
  metrics,
  progress,
  currentProbabilities,
  nodeOrder
}: SidebarProps) {
  const [selectedStart, setSelectedStart] = useState<string>(predefinedPlaces[0].id);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [params, setParams] = useState(DEFAULT_ACO_PARAMS);
  const [requestConfig, setRequestConfig] = useState(DEFAULT_REQUEST_CONFIG);
  const [speed, setSpeed] = useState(1);
  const [showFallbacks, setShowFallbacks] = useState(false);

  const handleStopToggle = (id: string, checked: boolean) => {
    const newStops = new Set(selectedStops);
    if (checked) {
      newStops.add(id);
    } else {
      newStops.delete(id);
    }
    setSelectedStops(newStops);
  };

  const handleBuildMatrix = () => {
    const start = predefinedPlaces.find(p => p.id === selectedStart)!;
    const stops = predefinedPlaces.filter(p => selectedStops.has(p.id));
    onBuildMatrix(start, stops, requestConfig.requestDelay, requestConfig.maxRetries);
  };

  const handleParamChange = (key: string, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange(newParams);
  };

  return (
    <div className="w-full lg:w-[360px] h-full gradient-sidebar border-r border-border overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-6">
        {/* Location Selection */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Footprints className="w-4 h-4 text-primary" />
            Selección de Ubicaciones
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="startSelect" className="text-sm">Punto de Inicio</Label>
              <Select value={selectedStart} onValueChange={setSelectedStart}>
                <SelectTrigger id="startSelect" className="mt-1">
                  <SelectValue placeholder="Seleccionar inicio" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedPlaces.map(place => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Paradas a Visitar (mín. 3)</Label>
              <div id="stopsList" className="mt-2 max-h-48 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-lg">
                {predefinedPlaces.filter(p => p.id !== selectedStart).map(place => (
                  <div key={place.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`stop-${place.id}`}
                      checked={selectedStops.has(place.id)}
                      onCheckedChange={(checked) => handleStopToggle(place.id, checked as boolean)}
                    />
                    <Label htmlFor={`stop-${place.id}`} className="text-sm cursor-pointer">
                      {place.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Seleccionadas: {selectedStops.size}
              </p>
            </div>

            <Button 
              id="buildMatrix"
              onClick={handleBuildMatrix}
              disabled={selectedStops.size < 3 || isRunning}
              className="w-full"
            >
              Construir Matriz de Distancias
            </Button>
          </div>
        </div>

        {/* ACO Parameters */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Parámetros ACO
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="numHormigas" className="text-xs">Hormigas</Label>
              <Input
                id="numHormigas"
                type="number"
                min={1}
                max={50}
                value={params.numHormigas}
                onChange={(e) => handleParamChange('numHormigas', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="iteraciones" className="text-xs">Iteraciones</Label>
              <Input
                id="iteraciones"
                type="number"
                min={1}
                max={200}
                value={params.iteraciones}
                onChange={(e) => handleParamChange('iteraciones', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="alpha" className="text-xs">Alpha (α)</Label>
              <Input
                id="alpha"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={params.alpha}
                onChange={(e) => handleParamChange('alpha', parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="beta" className="text-xs">Beta (β)</Label>
              <Input
                id="beta"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={params.beta}
                onChange={(e) => handleParamChange('beta', parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rho" className="text-xs">Rho (ρ)</Label>
              <Input
                id="rho"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={params.rho}
                onChange={(e) => handleParamChange('rho', parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="Q" className="text-xs">Q (depósito)</Label>
              <Input
                id="Q"
                type="number"
                min={1}
                max={1000}
                value={params.Q}
                onChange={(e) => handleParamChange('Q', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="minPheromone" className="text-xs">Min. Feromona</Label>
              <Input
                id="minPheromone"
                type="number"
                min={0}
                max={0.01}
                step={0.000001}
                value={params.minPheromone}
                onChange={(e) => handleParamChange('minPheromone', parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* API Config */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Configuración API
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="requestDelay" className="text-xs">Delay (ms)</Label>
              <Input
                id="requestDelay"
                type="number"
                min={120}
                max={250}
                value={requestConfig.requestDelay}
                onChange={(e) => setRequestConfig(c => ({ ...c, requestDelay: parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxRetries" className="text-xs">Max Reintentos</Label>
              <Input
                id="maxRetries"
                type="number"
                min={1}
                max={10}
                value={requestConfig.maxRetries}
                onChange={(e) => setRequestConfig(c => ({ ...c, maxRetries: parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Checkbox
              id="showFallbacks"
              checked={showFallbacks}
              onCheckedChange={(checked) => {
                setShowFallbacks(checked as boolean);
                onShowFallbacksChange(checked as boolean);
              }}
            />
            <Label htmlFor="showFallbacks" className="text-sm">Mostrar fallbacks</Label>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Controles
          </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button id="runACO" onClick={onRunACO} disabled={isRunning} variant="default">
                <Zap className="w-4 h-4 mr-1" /> Ejecutar ACO
              </Button>
              <Button id="pauseResume" onClick={onTogglePause} disabled={!isRunning} variant={isPaused ? "secondary" : "outline"}>
                {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                {isPaused ? 'Continuar' : 'Pausar'}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button id="animateACO" onClick={onAnimateACO} disabled={isRunning} variant="outline">
                <FastForward className="w-4 h-4 mr-1" /> Animar
              </Button>
              <Button id="showBest" onClick={onShowBest} variant="success">
                <Eye className="w-4 h-4 mr-1" /> Ver Mejor
              </Button>
            </div>

            <div className="border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Modo Paso-a-Paso</Label>
              <div className="flex gap-2">
                <Button 
                  id="stepModeBtn" 
                  onClick={() => onStepMode(!isStepMode)} 
                  variant={isStepMode ? "default" : "outline"}
                  size="sm"
                >
                  {isStepMode ? 'ON' : 'OFF'}
                </Button>
                <Button id="stepNext" onClick={onStepNext} disabled={!isStepMode} size="sm" variant="outline">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button id="stepAuto" onClick={onStepAuto} disabled={!isStepMode} size="sm" variant="outline">
                  Auto
                </Button>
                <Button id="stepReset" onClick={onStepReset} size="sm" variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Heurísticas Comparativas</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button id="runNN" onClick={onRunNN} variant="muted" size="sm">
                  Vecino Cercano
                </Button>
                <Button id="run2Opt" onClick={onRun2Opt} variant="muted" size="sm">
                  2-Opt
                </Button>
              </div>
            </div>

            <Button id="exportJson" onClick={onExport} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" /> Exportar JSON
            </Button>
          </div>
        </div>

        {/* Speed Control */}
        <div className="control-card">
          <Label htmlFor="speedControl" className="text-sm mb-2 block">
            Velocidad de Animación: {speed}x
          </Label>
          <Slider
            id="speedControl"
            min={0.25}
            max={4}
            step={0.25}
            value={[speed]}
            onValueChange={([v]) => {
              setSpeed(v);
              onSpeedChange(v);
            }}
          />
        </div>

        {/* Progress */}
        <div className="control-card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso</span>
            <span id="progressText" className="font-mono">{progress.toFixed(0)}%</span>
          </div>
          <Progress id="progressBar" value={progress} />
        </div>

        {/* Probability Panel */}
        {currentProbabilities.length > 0 && (
          <div id="probPanel" className="control-card">
            <h3 className="font-semibold text-foreground mb-3">Probabilidades P<sub>ij</sub></h3>
            <div id="probBars" className="space-y-2">
              {currentProbabilities.map((prob, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{nodeOrder[prob.nodeIndex]?.name || `Nodo ${prob.nodeIndex}`}</span>
                    <span className="font-mono">{(prob.probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="probability-bar h-full transition-all"
                      style={{ width: `${prob.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-3">Métricas</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground text-xs">API Calls</div>
              <div id="apiCalls" className="font-mono font-semibold">{metrics.apiCalls}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground text-xs">Reintentos</div>
              <div id="totalRetries" className="font-mono font-semibold">{metrics.totalRetries}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground text-xs">Fallbacks</div>
              <div id="fallbackCount" className="font-mono font-semibold">{metrics.fallbackCount}</div>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <div className="text-muted-foreground text-xs">Mejor Ruta</div>
              <div className="font-mono font-semibold text-secondary">
                {metrics.bestLength === Infinity ? '-' : `${Math.round(metrics.bestLength)}m`}
              </div>
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="control-card">
          <h3 className="font-semibold text-foreground mb-3">Log</h3>
          <div id="log" className="max-h-48 overflow-y-auto bg-muted/30 rounded-lg">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">Sin eventos aún...</p>
            ) : (
              logs.slice().reverse().map((log, i) => (
                <div key={i} className={`log-entry ${log.type}`}>
                  <span className="text-muted-foreground mr-2">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
