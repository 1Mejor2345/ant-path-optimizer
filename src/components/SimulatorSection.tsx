import { useState, useCallback, useRef, useEffect } from 'react';
import { EnhancedMapView } from './EnhancedMapView';
import { SimulatorWizard } from './SimulatorWizard';
import { MiniConvergenceChart } from './MiniConvergenceChart';
import { useACOSimulator } from '@/hooks/useACOSimulator';
import { useAntAnimation } from '@/hooks/useAntAnimation';
import { predefinedPlaces, DEFAULT_ACO_PARAMS, type PredefinedPlace } from '@/lib/maps-constants';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { runNearestNeighbor } from '@/lib/aco-algorithm';
import { getFullNodeOrder, getCachedMatrix, cacheMatrix, hasCachedMatrix } from '@/lib/preloaded-matrix';

export function SimulatorSection() {
  const { isLoaded } = useGoogleMaps();
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  const {
    state,
    setState,
    buildDistanceMatrix,
    ejecutarACO,
    togglePause,
    reset,
    addLog
  } = useACOSimulator();

  const [params, setParams] = useState(DEFAULT_ACO_PARAMS);
  const [speed, setSpeed] = useState(1);
  const [showPheromoneMap, setShowPheromoneMap] = useState(true);
  const [showBestRoute, setShowBestRoute] = useState(false);
  const [bestRouteColor, setBestRouteColor] = useState('#10b981');
  const [matrixProgress, setMatrixProgress] = useState(0);
  const [nnSolution, setNnSolution] = useState<{ tour: number[]; length: number } | null>(null);

  const {
    animatedAnts,
    swarmDots,
    pheromoneTrails,
    activePaths,
    animateSingleAnt,
    animateSwarmIteration,
    stopAnimation,
    clearTrails,
    clearPaths
  } = useAntAnimation({
    routePolylines: state.routePolylines,
    nodeOrder: state.nodeOrder,
    speed
  });

  useEffect(() => {
    if (isLoaded && !directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
  }, [isLoaded]);

  const handleBuildMatrix = useCallback(async (
    start: PredefinedPlace,
    stops: PredefinedPlace[],
    delay: number,
    retries: number
  ) => {
    const nodeOrder = [start, ...stops];
    setMatrixProgress(0);
    setNnSolution(null);
    clearTrails();
    
    const result = await buildDistanceMatrix(
      nodeOrder,
      directionsServiceRef.current,
      delay,
      retries,
      (progress) => setMatrixProgress(progress)
    );
    
    return result;
  }, [buildDistanceMatrix, clearTrails]);

  // Construir matriz completa con los 14 puntos
  const handleBuildFullMatrix = useCallback(async () => {
    const fullNodeOrder = getFullNodeOrder();
    setMatrixProgress(0);
    setNnSolution(null);
    clearTrails();
    
    const result = await buildDistanceMatrix(
      fullNodeOrder,
      directionsServiceRef.current,
      150,
      3,
      (progress) => setMatrixProgress(progress)
    );
    
    // Cachear la matriz para uso futuro
    if (result) {
      cacheMatrix(result.matrix, result.polylines);
      addLog('Matriz completa guardada en cache para uso futuro', 'success');
    }
    
    return result;
  }, [buildDistanceMatrix, clearTrails, addLog]);

  // Cargar matriz desde cache
  const handleLoadCachedMatrix = useCallback(() => {
    const cached = getCachedMatrix();
    if (!cached) return false;
    
    const fullNodeOrder = getFullNodeOrder();
    setNnSolution(null);
    clearTrails();
    
    setState(prev => ({
      ...prev,
      distanceMatrix: cached.matrix,
      routePolylines: cached.polylines,
      fallbackEdges: new Set<string>(),
      nodeOrder: fullNodeOrder,
      bestSolution: null,
      bestPerIteration: [],
      pheromone: [],
      progress: 0,
      metrics: {
        ...prev.metrics,
        apiCalls: 0,
        totalRetries: 0,
        fallbackCount: 0
      }
    }));
    
    addLog(`Matriz cacheada cargada: 14 ubicaciones (14x14)`, 'success');
    addLog('Usando rutas peatonales reales de Google Maps', 'info');
    
    setMatrixProgress(100);
    return true;
  }, [clearTrails, addLog, setState]);

  const handleRunACO = useCallback(async () => {
    setShowBestRoute(false);
    setShowPheromoneMap(true);
    clearTrails();
    clearPaths();
    
    const result = await ejecutarACO(
      params,
      speed,
      (iteration, best, solutions) => {
        // Animate swarm dots for this iteration
        animateSwarmIteration(
          solutions,
          iteration,
          params.iteraciones,
          state.pheromone
        );
      },
      (ant, probs) => {
        // Step callback
      }
    );
    
    return result;
  }, [ejecutarACO, params, speed, clearTrails, clearPaths, animateSwarmIteration, state.pheromone]);

  const handleRunNN = useCallback(() => {
    if (state.distanceMatrix.length === 0) {
      addLog('Error: Primero construya la matriz de distancias', 'error');
      return null;
    }

    const result = runNearestNeighbor(state.distanceMatrix, 0);
    setNnSolution(result);
    addLog(`Vecino mas cercano: ${Math.round(result.length)}m`, 'info');
    return result;
  }, [state.distanceMatrix, addLog]);

  const handleAnimateRoute = useCallback(async (
    algorithm: 'aco' | 'nn',
    tour: number[],
    color: string
  ) => {
    // Don't stop other animations, allow concurrent animations
    setShowBestRoute(false);
    
    const emoji = algorithm === 'aco' ? '\uD83D\uDC1C' : '\uD83D\uDC1D';
    const id = `${algorithm}-ant-${Date.now()}`;
    
    addLog(`Animando ruta ${algorithm.toUpperCase()}...`, 'info');
    
    await animateSingleAnt(tour, color, emoji, id, algorithm);
    
    addLog(`Animacion ${algorithm.toUpperCase()} completada`, 'success');
  }, [animateSingleAnt, addLog]);

  // Esta función ya no se usa, pero mantenemos para compatibilidad por ahora

  const handleReset = useCallback(() => {
    stopAnimation();
    clearTrails();
    clearPaths();
    setMatrixProgress(0);
    setNnSolution(null);
    setShowBestRoute(false);
    reset();
  }, [reset, stopAnimation, clearTrails, clearPaths]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left Panel - Wizard */}
      <div className="w-full lg:w-[380px] h-[40vh] lg:h-full border-b lg:border-b-0 lg:border-r border-border overflow-hidden flex flex-col">
        <SimulatorWizard
          onBuildMatrix={handleBuildMatrix}
          onBuildFullMatrix={handleBuildFullMatrix}
          onLoadCachedMatrix={handleLoadCachedMatrix}
          onRunACO={handleRunACO}
          onRunNN={handleRunNN}
          onAnimateRoute={handleAnimateRoute}
          onReset={handleReset}
          onParamsChange={setParams}
          onSpeedChange={setSpeed}
          isRunning={state.isRunning}
          isPaused={state.isPaused}
          onTogglePause={togglePause}
          logs={state.logs}
          metrics={state.metrics}
          matrixProgress={matrixProgress}
          acoProgress={state.progress}
          bestSolution={state.bestSolution}
          nnSolution={nnSolution}
          nodeOrder={state.nodeOrder}
          hasCachedFullMatrix={hasCachedMatrix()}
        />
      </div>
      
      {/* Right Panel - Map and Chart */}
      <div className="flex-1 flex flex-col h-[60vh] lg:h-full overflow-hidden">
        {/* Map */}
        <div className="flex-1 p-3 min-h-0">
          <EnhancedMapView
            nodeOrder={state.nodeOrder.length > 0 ? state.nodeOrder : predefinedPlaces}
            routePolylines={state.routePolylines}
            fallbackEdges={state.fallbackEdges}
            pheromone={state.pheromone}
            bestSolution={showBestRoute ? state.bestSolution : null}
            showPheromoneMap={showPheromoneMap}
            showBestRoute={showBestRoute}
            bestRouteColor={bestRouteColor}
            animatedAnts={animatedAnts}
            swarmDots={swarmDots}
            pheromoneTrails={pheromoneTrails}
            activePaths={activePaths}
          />
        </div>
        
        {/* Bottom Stats */}
        {state.bestPerIteration.length > 0 && (
          <div className="p-3 pt-0 flex gap-3 items-end">
            <MiniConvergenceChart 
              data={state.bestPerIteration} 
              width={280} 
              height={80} 
            />
            
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div className="bg-card/50 rounded-lg p-2 border border-border/50">
                <div className="text-[10px] text-muted-foreground">Iteracion</div>
                <div className="font-mono font-bold text-sm">{state.metrics.currentIteration}</div>
              </div>
              <div className="bg-card/50 rounded-lg p-2 border border-border/50">
                <div className="text-[10px] text-muted-foreground">Mejor ACO</div>
                <div className="font-mono font-bold text-sm text-secondary">
                  {state.bestSolution ? `${Math.round(state.bestSolution.length)}m` : '-'}
                </div>
              </div>
              <div className="bg-card/50 rounded-lg p-2 border border-border/50">
                <div className="text-[10px] text-muted-foreground">Mejor NN</div>
                <div className="font-mono font-bold text-sm text-amber-500">
                  {nnSolution ? `${Math.round(nnSolution.length)}m` : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
