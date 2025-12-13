import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, RotateCcw, MapPin, Settings, Zap, 
  ChevronRight, ChevronLeft, Bug, Route, ArrowRight, Database
} from 'lucide-react';
import { predefinedPlaces, DEFAULT_ACO_PARAMS, type PredefinedPlace } from '@/lib/maps-constants';
import { type LogEntry, type ACOMetrics } from '@/hooks/useACOSimulator';
import { cn } from '@/lib/utils';
import { getFullNodeOrder, getCachedMatrix, hasCachedMatrix } from '@/lib/preloaded-matrix';

type WizardStep = 'locations' | 'matrix' | 'params' | 'execute' | 'controls';

interface SimulatorWizardProps {
  onBuildMatrix: (start: PredefinedPlace, stops: PredefinedPlace[], delay: number, retries: number) => Promise<any>;
  onBuildFullMatrix: () => Promise<any>;
  onLoadCachedMatrix: () => boolean;
  onRunACO: () => Promise<any>;
  onRunNN: () => { tour: number[]; length: number } | null;
  onAnimateRoute: (algorithm: 'aco' | 'nn', tour: number[], color: string) => void;
  onReset: () => void;
  onParamsChange: (params: any) => void;
  onSpeedChange: (speed: number) => void;
  isRunning: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  logs: LogEntry[];
  metrics: ACOMetrics;
  matrixProgress: number;
  acoProgress: number;
  bestSolution: { tour: number[]; length: number } | null;
  nnSolution: { tour: number[]; length: number } | null;
  nodeOrder: PredefinedPlace[];
  hasCachedFullMatrix: boolean;
}

export function SimulatorWizard({
  onBuildMatrix,
  onBuildFullMatrix,
  onLoadCachedMatrix,
  onRunACO,
  onRunNN,
  onAnimateRoute,
  onReset,
  onParamsChange,
  onSpeedChange,
  isRunning,
  isPaused,
  onTogglePause,
  logs,
  metrics,
  matrixProgress,
  acoProgress,
  bestSolution,
  nnSolution,
  nodeOrder,
  hasCachedFullMatrix
}: SimulatorWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('locations');
  const [selectedStart, setSelectedStart] = useState<string>(predefinedPlaces[0].id);
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [params, setParams] = useState(DEFAULT_ACO_PARAMS);
  const [speed, setSpeed] = useState(1);
  const [matrixBuilt, setMatrixBuilt] = useState(false);
  const [useFullMatrix, setUseFullMatrix] = useState(false);
  const [acoExecuted, setAcoExecuted] = useState(false);
  const [localNNSolution, setLocalNNSolution] = useState<{ tour: number[]; length: number } | null>(null);
  const [buildingFullMatrix, setBuildingFullMatrix] = useState(false);

  const stepOrder: WizardStep[] = ['locations', 'matrix', 'params', 'execute', 'controls'];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  // Reset everything when locations change
  const handleLocationChange = () => {
    setMatrixBuilt(false);
    setUseFullMatrix(false);
    setAcoExecuted(false);
    setLocalNNSolution(null);
    onReset();
  };

  const handleLoadCached = () => {
    const loaded = onLoadCachedMatrix();
    if (loaded) {
      setMatrixBuilt(true);
      setUseFullMatrix(true);
    }
  };

  const handleBuildFullMatrix = async () => {
    setBuildingFullMatrix(true);
    await onBuildFullMatrix();
    setMatrixBuilt(true);
    setUseFullMatrix(true);
    setBuildingFullMatrix(false);
  };

  const handleStopToggle = (id: string, checked: boolean) => {
    const newStops = new Set(selectedStops);
    if (checked) {
      newStops.add(id);
    } else {
      newStops.delete(id);
    }
    setSelectedStops(newStops);
    handleLocationChange();
  };

  const handleStartChange = (value: string) => {
    setSelectedStart(value);
    handleLocationChange();
  };

  const handleBuildMatrix = async () => {
    const start = predefinedPlaces.find(p => p.id === selectedStart)!;
    const stops = predefinedPlaces.filter(p => selectedStops.has(p.id));
    await onBuildMatrix(start, stops, 150, 3);
    setMatrixBuilt(true);
  };

  const handleRunACO = async () => {
    await onRunACO();
    setAcoExecuted(true);
  };

  const handleRunNN = () => {
    const result = onRunNN();
    if (result) {
      setLocalNNSolution(result);
    }
  };

  const handleParamChange = (key: string, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange(newParams);
  };

  const canProceedFromLocations = selectedStops.size >= 3;
  const canProceedFromMatrix = matrixBuilt && matrixProgress >= 100;
  const canProceedFromExecute = acoExecuted && acoProgress >= 100;

  const goToNextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, stepOrder.length - 1);
    setCurrentStep(stepOrder[nextIndex]);
  };

  const goToPrevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(stepOrder[prevIndex]);
  };

  const goToStep = (step: WizardStep) => {
    const targetIndex = stepOrder.indexOf(step);
    // Only allow going back, or forward if current step is complete
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(step);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      {stepOrder.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = index < currentStepIndex;
        const isClickable = index <= currentStepIndex;
        
        const labels: Record<WizardStep, string> = {
          locations: 'Ubicaciones',
          matrix: 'Matriz',
          params: 'Parámetros',
          execute: 'Ejecutar',
          controls: 'Controles'
        };

        return (
          <div key={step} className="flex items-center">
            <button
              onClick={() => isClickable && goToStep(step)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center transition-all",
                isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                isActive && "bg-primary text-primary-foreground scale-110",
                isCompleted && "bg-secondary text-secondary-foreground",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={cn(
                "text-[10px] mt-1",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {labels[step]}
              </span>
            </button>
            {index < stepOrder.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-1",
                index < currentStepIndex ? "bg-secondary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderLocationsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Selección de Ubicaciones</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Punto de Inicio</Label>
        <Select value={selectedStart} onValueChange={handleStartChange}>
          <SelectTrigger className="mt-1">
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
        <Label className="text-sm font-medium">Paradas a Visitar</Label>
        <p className="text-xs text-muted-foreground mb-2">Selecciona al menos 3 paradas</p>
        <div className="max-h-[200px] overflow-y-auto space-y-1.5 p-2 bg-muted/20 rounded-lg border border-border/50">
          {predefinedPlaces.filter(p => p.id !== selectedStart).map(place => (
            <div key={place.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 transition-colors">
              <Checkbox
                id={`stop-${place.id}`}
                checked={selectedStops.has(place.id)}
                onCheckedChange={(checked) => handleStopToggle(place.id, checked as boolean)}
              />
              <Label htmlFor={`stop-${place.id}`} className="text-sm cursor-pointer flex-1">
                {place.name}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <Badge variant={selectedStops.size >= 3 ? "default" : "secondary"}>
            {selectedStops.size} seleccionadas
          </Badge>
          {selectedStops.size < 3 && (
            <span className="text-xs text-amber-500">Mínimo 3 paradas</span>
          )}
        </div>
      </div>

      <Button 
        onClick={goToNextStep}
        disabled={!canProceedFromLocations}
        className="w-full mt-4"
      >
        Continuar <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  const renderMatrixStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Route className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Matriz de Distancias</h3>
      </div>

      {/* Opción 1: Matriz Completa (14 puntos) */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Matriz Completa (14 puntos)</p>
          {hasCachedFullMatrix && (
            <Badge variant="secondary" className="text-[10px]">Cacheada</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {hasCachedFullMatrix 
            ? 'Matriz de rutas reales ya calculada y guardada. Carga instantánea.'
            : 'Construye la matriz con rutas peatonales reales de Google Maps para los 14 puntos del campus.'
          }
        </p>
        
        {!matrixBuilt ? (
          hasCachedFullMatrix ? (
            <Button 
              onClick={handleLoadCached}
              disabled={isRunning}
              className="w-full"
              variant="default"
            >
              <Database className="w-4 h-4 mr-2" />
              Cargar Matriz Cacheada (14 pts)
            </Button>
          ) : (
            <Button 
              onClick={handleBuildFullMatrix}
              disabled={isRunning || buildingFullMatrix}
              className="w-full"
              variant="default"
            >
              {buildingFullMatrix ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Construyendo...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Construir Matriz Completa (14 pts)
                </>
              )}
            </Button>
          )
        ) : useFullMatrix ? (
          <div className="p-2 bg-secondary/10 rounded border border-secondary/30">
            <p className="text-sm text-secondary font-medium">✓ Matriz completa cargada (14x14)</p>
            <p className="text-xs text-muted-foreground">Rutas peatonales reales de Google Maps</p>
          </div>
        ) : null}
      </div>

      {/* Opción 2: Construir solo seleccionados */}
      <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Solo Puntos Seleccionados</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Calcula rutas peatonales reales vía Google Maps solo para los {selectedStops.size + 1} puntos seleccionados.
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span className="font-mono">{matrixProgress.toFixed(0)}%</span>
          </div>
          <Progress value={matrixProgress} className="h-2" />
        </div>

        {!matrixBuilt ? (
          <Button 
            onClick={handleBuildMatrix}
            disabled={isRunning}
            className="w-full"
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            Construir Matriz ({selectedStops.size + 1} puntos)
          </Button>
        ) : !useFullMatrix ? (
          <div className="p-2 bg-secondary/10 rounded border border-secondary/30">
            <p className="text-sm text-secondary font-medium">✓ Matriz construida</p>
            <p className="text-xs text-muted-foreground">
              {metrics.apiCalls} llamadas API, {metrics.fallbackCount} fallbacks
            </p>
          </div>
        ) : null}
      </div>

      {/* Botón para reconstruir si ya hay matriz */}
      {matrixBuilt && (
        <Button 
          onClick={() => {
            setMatrixBuilt(false);
            setUseFullMatrix(false);
            setAcoExecuted(false);
          }}
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Cambiar tipo de matriz
        </Button>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={goToPrevStep} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button 
          onClick={goToNextStep}
          disabled={!canProceedFromMatrix}
          className="flex-1"
        >
          Continuar <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderParamsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Parámetros ACO</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Hormigas</Label>
          <Input
            type="number"
            min={5}
            max={50}
            value={params.numHormigas}
            onChange={(e) => handleParamChange('numHormigas', parseInt(e.target.value) || 10)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Iteraciones</Label>
          <Input
            type="number"
            min={5}
            max={100}
            value={params.iteraciones}
            onChange={(e) => handleParamChange('iteraciones', parseInt(e.target.value) || 20)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Alpha (α) - Feromona</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={params.alpha}
            onChange={(e) => handleParamChange('alpha', parseFloat(e.target.value) || 1)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Beta (β) - Visibilidad</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={params.beta}
            onChange={(e) => handleParamChange('beta', parseFloat(e.target.value) || 2)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Rho (ρ) - Evaporación</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={params.rho}
            onChange={(e) => handleParamChange('rho', parseFloat(e.target.value) || 0.5)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Q - Depósito</Label>
          <Input
            type="number"
            min={1}
            max={500}
            value={params.Q}
            onChange={(e) => handleParamChange('Q', parseInt(e.target.value) || 100)}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={goToPrevStep} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button onClick={goToNextStep} className="flex-1">
          Continuar <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderExecuteStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Ejecutar Algoritmos</h3>
      </div>

      <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Progreso ACO</span>
            <span className="font-mono">{acoProgress.toFixed(0)}%</span>
          </div>
          <Progress value={acoProgress} className="h-2" />
        </div>

        {!acoExecuted && (
          <Button 
            onClick={handleRunACO}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <div className="animate-spin mr-2">🐜</div>
                Ejecutando...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Ejecutar ACO
              </>
            )}
          </Button>
        )}

        {isRunning && (
          <Button 
            onClick={onTogglePause}
            variant="outline"
            className="w-full mt-2"
          >
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? 'Continuar' : 'Pausar'}
          </Button>
        )}

        {acoExecuted && acoProgress >= 100 && bestSolution && (
          <div className="mt-4 p-3 bg-secondary/10 rounded-lg border border-secondary/30">
            <p className="text-sm text-secondary font-medium">✓ ACO completado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mejor ruta: <span className="font-mono font-semibold">{Math.round(bestSolution.length)}m</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={goToPrevStep} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button 
          onClick={goToNextStep}
          disabled={!canProceedFromExecute}
          className="flex-1"
        >
          Ver Controles <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderControlsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Controles de Animación</h3>
      </div>

      {/* Speed Control */}
      <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
        <Label className="text-sm mb-2 block">
          Velocidad: <span className="font-mono font-semibold">{speed}x</span>
        </Label>
        <Slider
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

      {/* Algorithm Animations */}
      <div className="space-y-3">
          {/* ACO Animation */}
        <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐜</span>
              <div>
                <p className="font-semibold text-sm">Colonia de Hormigas (ACO)</p>
                {bestSolution && (
                  <p className="text-xs text-muted-foreground">
                    Ruta: {Math.round(bestSolution.length)}m
                  </p>
                )}
              </div>
            </div>
            <Badge className="bg-blue-500">Hormiga Azul</Badge>
          </div>
          <Button 
            onClick={() => bestSolution && onAnimateRoute('aco', bestSolution.tour, '#3b82f6')}
            disabled={!bestSolution}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            variant="default"
          >
            <Play className="w-4 h-4 mr-2" />
            Animar Ruta ACO
          </Button>
        </div>

        {/* Nearest Neighbor Animation */}
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-lg p-4 border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
              <div>
                <p className="font-semibold text-sm">Vecino más Cercano</p>
                {(nnSolution || localNNSolution) && (
                  <p className="text-xs text-muted-foreground">
                    Ruta: {Math.round((nnSolution || localNNSolution)!.length)}m
                  </p>
                )}
              </div>
            </div>
            <Badge className="bg-amber-500">Abeja Amarilla</Badge>
          </div>
          {!localNNSolution && !nnSolution ? (
            <Button 
              onClick={handleRunNN}
              className="w-full"
              variant="outline"
            >
              <Zap className="w-4 h-4 mr-2" />
              Calcular Vecino Cercano
            </Button>
          ) : (
            <Button 
              onClick={() => {
                const solution = nnSolution || localNNSolution;
                if (solution) onAnimateRoute('nn', solution.tour, '#f59e0b');
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Animar Ruta NN
            </Button>
          )}
        </div>
      </div>

      {/* Comparison */}
      {bestSolution && (nnSolution || localNNSolution) && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-xs font-semibold mb-2">Comparación</p>
          <div className="flex justify-between text-sm">
            <span>🐜 ACO:</span>
            <span className="font-mono">{Math.round(bestSolution.length)}m</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>🐝 NN:</span>
            <span className="font-mono">{Math.round((nnSolution || localNNSolution)!.length)}m</span>
          </div>
          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
            <span>Mejora ACO:</span>
            <span className={cn(
              "font-mono font-semibold",
              bestSolution.length < (nnSolution || localNNSolution)!.length ? "text-secondary" : "text-destructive"
            )}>
              {(((nnSolution || localNNSolution)!.length - bestSolution.length) / (nnSolution || localNNSolution)!.length * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Reset */}
      <Button 
        variant="outline"
        onClick={() => {
          handleLocationChange();
          setCurrentStep('locations');
        }}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reiniciar Todo
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur">
      <div className="p-4 border-b border-border/50">
        {renderStepIndicator()}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {currentStep === 'locations' && renderLocationsStep()}
        {currentStep === 'matrix' && renderMatrixStep()}
        {currentStep === 'params' && renderParamsStep()}
        {currentStep === 'execute' && renderExecuteStep()}
        {currentStep === 'controls' && renderControlsStep()}
      </div>

      {/* Compact Logs */}
      <div className="border-t border-border/50 p-3 max-h-[120px] overflow-y-auto bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Logs</p>
        <div className="space-y-0.5">
          {logs.slice(-5).reverse().map((log, i) => (
            <div key={i} className={cn(
              "text-[10px] truncate",
              log.type === 'success' && "text-secondary",
              log.type === 'error' && "text-destructive",
              log.type === 'warning' && "text-amber-500",
              log.type === 'info' && "text-muted-foreground"
            )}>
              <span className="opacity-60">{log.timestamp.toLocaleTimeString()}</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
