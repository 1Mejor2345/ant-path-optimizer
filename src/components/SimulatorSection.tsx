import { useState, useCallback, useRef, useEffect } from 'react';
import { MapView } from './MapView';
import { Sidebar } from './Sidebar';
import { ConvergenceChart } from './ConvergenceChart';
import { useACOSimulator } from '@/hooks/useACOSimulator';
import { predefinedPlaces, DEFAULT_ACO_PARAMS, type PredefinedPlace } from '@/lib/maps-constants';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

export function SimulatorSection() {
  const { isLoaded } = useGoogleMaps();
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  const {
    state,
    buildDistanceMatrix,
    ejecutarACO,
    advanceStep,
    togglePause,
    setStepMode,
    runNearestNeighborHeuristic,
    run2OptHeuristic,
    exportResults,
    reset,
    addLog
  } = useACOSimulator();

  const [params, setParams] = useState(DEFAULT_ACO_PARAMS);
  const [speed, setSpeed] = useState(1);
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [showPheromoneMap, setShowPheromoneMap] = useState(true);
  const [showBestRoute, setShowBestRoute] = useState(false);
  const [animatedAntPosition, setAnimatedAntPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);

  // Initialize DirectionsService when Maps API is loaded
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
    setBuildProgress(0);
    
    await buildDistanceMatrix(
      nodeOrder,
      directionsServiceRef.current,
      delay,
      retries,
      (progress) => setBuildProgress(progress)
    );
  }, [buildDistanceMatrix]);

  const handleRunACO = useCallback(async () => {
    setShowBestRoute(false);
    setShowPheromoneMap(true);
    
    await ejecutarACO(
      params,
      speed,
      (iteration, best) => {
        // Callback per iteration
      },
      (ant, probs) => {
        // Callback per ant step (for step mode)
      }
    );
  }, [ejecutarACO, params, speed]);

  const handleAnimateACO = useCallback(async () => {
    if (!state.bestSolution || state.bestSolution.tour.length === 0) {
      addLog('No hay solución para animar. Ejecute ACO primero.', 'error');
      return;
    }

    const tour = state.bestSolution.tour;
    const routePolylines = state.routePolylines;

    // Build full path for animation
    const fullPath: google.maps.LatLngLiteral[] = [];
    for (let i = 0; i < tour.length; i++) {
      const from = tour[i];
      const to = tour[(i + 1) % tour.length];
      const edgeKey = `${from}_${to}`;
      const reverseKey = `${to}_${from}`;
      const path = routePolylines[edgeKey] || routePolylines[reverseKey];
      
      if (path) {
        const shouldReverse = !routePolylines[edgeKey] && routePolylines[reverseKey];
        const orderedPath = shouldReverse ? [...path].reverse() : path;
        fullPath.push(...orderedPath);
      }
    }

    // Animate ant along path
    const animationDuration = 5000 / speed; // 5 seconds base
    const stepDuration = animationDuration / fullPath.length;

    for (let i = 0; i < fullPath.length; i++) {
      setAnimatedAntPosition(fullPath[i]);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }

    setAnimatedAntPosition(null);
  }, [state.bestSolution, state.routePolylines, speed, addLog]);

  const handleShowBest = useCallback(() => {
    if (!state.bestSolution) {
      addLog('No hay mejor ruta. Ejecute ACO primero.', 'error');
      return;
    }
    setShowBestRoute(true);
    setShowPheromoneMap(false);
    addLog(`Mostrando mejor ruta: ${Math.round(state.bestSolution.length)}m`, 'success');
  }, [state.bestSolution, addLog]);

  const handleRunNN = useCallback(() => {
    const result = runNearestNeighborHeuristic();
    if (result) {
      addLog(`Vecino más cercano completado: ${Math.round(result.length)}m`, 'info');
    }
  }, [runNearestNeighborHeuristic, addLog]);

  const handleRun2Opt = useCallback(() => {
    const result = run2OptHeuristic();
    if (result) {
      addLog(`2-opt completado: ${Math.round(result.length)}m`, 'success');
    }
  }, [run2OptHeuristic, addLog]);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar
        onBuildMatrix={handleBuildMatrix}
        onRunACO={handleRunACO}
        onAnimateACO={handleAnimateACO}
        onShowBest={handleShowBest}
        onTogglePause={togglePause}
        onExport={exportResults}
        onStepMode={setStepMode}
        onStepNext={advanceStep}
        onStepAuto={() => {
          // Auto-advance steps
          const interval = setInterval(() => {
            advanceStep();
          }, 500 / speed);
          setTimeout(() => clearInterval(interval), 30000);
        }}
        onStepReset={reset}
        onRunNN={handleRunNN}
        onRun2Opt={handleRun2Opt}
        onParamsChange={setParams}
        onSpeedChange={setSpeed}
        onShowFallbacksChange={setShowFallbacks}
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        isStepMode={state.isStepMode}
        logs={state.logs}
        metrics={state.metrics}
        progress={state.isRunning ? state.progress : buildProgress}
        currentProbabilities={state.currentProbabilities}
        nodeOrder={state.nodeOrder}
      />
      
      <div className="flex-1 p-4 space-y-4">
        <div id="map" className="h-[60vh] lg:h-[70vh]">
          <MapView
            nodeOrder={state.nodeOrder.length > 0 ? state.nodeOrder : predefinedPlaces}
            routePolylines={state.routePolylines}
            fallbackEdges={state.fallbackEdges}
            showFallbacks={showFallbacks}
            pheromone={state.pheromone}
            bestSolution={state.bestSolution}
            showPheromoneMap={showPheromoneMap}
            showBestRoute={showBestRoute}
            animatedAntPosition={animatedAntPosition}
            isFullscreen={isFullscreen}
          />
        </div>
        
        {state.bestPerIteration.length > 0 && (
          <ConvergenceChart data={state.bestPerIteration} />
        )}
      </div>
    </div>
  );
}
