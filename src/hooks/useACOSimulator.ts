import { useState, useCallback, useRef } from 'react';
import {
  inicializarFeromonas,
  inicializarHormigas,
  seleccionarSiguienteNodo,
  calcularLongitudRuta,
  actualizarFeromonas,
  runNearestNeighbor,
  run2Opt,
  haversineDistance,
  type Hormiga,
  type ACOParams,
  type ProbabilityInfo
} from '@/lib/aco-algorithm';
import { type PredefinedPlace } from '@/lib/maps-constants';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface ACOMetrics {
  apiCalls: number;
  totalRetries: number;
  fallbackCount: number;
  bestLength: number;
  currentIteration: number;
}

export interface SimulatorState {
  distanceMatrix: number[][];
  routePolylines: Record<string, google.maps.LatLngLiteral[]>;
  fallbackEdges: Set<string>;
  pheromone: number[][];
  bestSolution: { tour: number[]; length: number } | null;
  bestPerIteration: number[];
  currentProbabilities: ProbabilityInfo[];
  selectedNodes: number[];
  nodeOrder: PredefinedPlace[];
  isRunning: boolean;
  isPaused: boolean;
  isStepMode: boolean;
  currentStep: { ant: number; node: number } | null;
  logs: LogEntry[];
  metrics: ACOMetrics;
  progress: number;
}

const initialState: SimulatorState = {
  distanceMatrix: [],
  routePolylines: {},
  fallbackEdges: new Set(),
  pheromone: [],
  bestSolution: null,
  bestPerIteration: [],
  currentProbabilities: [],
  selectedNodes: [],
  nodeOrder: [],
  isRunning: false,
  isPaused: false,
  isStepMode: false,
  currentStep: null,
  logs: [],
  metrics: {
    apiCalls: 0,
    totalRetries: 0,
    fallbackCount: 0,
    bestLength: Infinity,
    currentIteration: 0
  },
  progress: 0
};

export function useACOSimulator() {
  const [state, setState] = useState<SimulatorState>(initialState);
  const pauseRef = useRef(false);
  const stepResolveRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-99), { timestamp: new Date(), message, type }]
    }));
  }, []);

  const updateMetrics = useCallback((updates: Partial<ACOMetrics>) => {
    setState(prev => ({
      ...prev,
      metrics: { ...prev.metrics, ...updates }
    }));
  }, []);

  const buildDistanceMatrix = useCallback(async (
    nodeOrder: PredefinedPlace[],
    directionsService: google.maps.DirectionsService | null,
    requestDelay: number,
    maxRetries: number,
    onProgress: (progress: number) => void
  ) => {
    if (!directionsService) {
      addLog('Error: DirectionsService no disponible', 'error');
      return null;
    }

    const n = nodeOrder.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const polylines: Record<string, google.maps.LatLngLiteral[]> = {};
    const fallbacks = new Set<string>();
    
    let apiCalls = 0;
    let totalRetries = 0;
    let fallbackCount = 0;
    const totalPairs = n * (n - 1);
    let completedPairs = 0;

    addLog(`Construyendo matriz de ${n}x${n} (${totalPairs} pares de rutas)`, 'info');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchRoute = async (
      origin: google.maps.LatLngLiteral,
      destination: google.maps.LatLngLiteral,
      retryCount: number = 0
    ): Promise<{ distance: number; path: google.maps.LatLngLiteral[] } | null> => {
      try {
        apiCalls++;
        const result = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.WALKING
        });

        if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
          const leg = result.routes[0].legs[0];
          const distance = leg.distance?.value || 0;
          const path = result.routes[0].overview_path?.map(p => ({
            lat: p.lat(),
            lng: p.lng()
          })) || [origin, destination];
          
          return { distance, path };
        }
        return null;
      } catch (error: any) {
        if (retryCount < maxRetries) {
          totalRetries++;
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          addLog(`Reintento ${retryCount + 1}/${maxRetries} después de ${backoffDelay}ms`, 'warning');
          await delay(backoffDelay);
          return fetchRoute(origin, destination, retryCount + 1);
        }
        return null;
      }
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
          continue;
        }

        const origin = nodeOrder[i].position;
        const destination = nodeOrder[j].position;
        const edgeKey = `${i}_${j}`;

        await delay(requestDelay);
        const result = await fetchRoute(origin, destination);

        if (result) {
          matrix[i][j] = result.distance;
          polylines[edgeKey] = result.path;
          addLog(`✓ ${nodeOrder[i].id} → ${nodeOrder[j].id}: ${result.distance}m`, 'success');
        } else {
          // Fallback a distancia Haversine
          const haversine = haversineDistance(
            origin.lat, origin.lng,
            destination.lat, destination.lng
          );
          matrix[i][j] = haversine * 1.4; // Factor para aproximar ruta peatonal
          polylines[edgeKey] = [origin, destination];
          fallbacks.add(edgeKey);
          fallbackCount++;
          addLog(`⚠ Fallback ${nodeOrder[i].id} → ${nodeOrder[j].id}: ${Math.round(matrix[i][j])}m (Haversine)`, 'warning');
        }

        completedPairs++;
        onProgress((completedPairs / totalPairs) * 100);
      }
    }

    updateMetrics({ apiCalls, totalRetries, fallbackCount });
    addLog(`Matriz completada: ${apiCalls} llamadas API, ${fallbackCount} fallbacks`, 'success');

    setState(prev => ({
      ...prev,
      distanceMatrix: matrix,
      routePolylines: polylines,
      fallbackEdges: fallbacks,
      nodeOrder
    }));

    return { matrix, polylines, fallbacks };
  }, [addLog, updateMetrics]);

  const ejecutarACO = useCallback(async (
    params: ACOParams,
    speedMultiplier: number = 1,
    onIterationComplete?: (iteration: number, best: number, solutions: Array<{ tour: number[]; length: number }>) => void,
    onAntStep?: (ant: Hormiga, probs: ProbabilityInfo[]) => void
  ) => {
    const { distanceMatrix, nodeOrder } = state;
    
    if (distanceMatrix.length === 0) {
      addLog('Error: Primero construya la matriz de distancias', 'error');
      return null;
    }

    setState(prev => ({ ...prev, isRunning: true, isPaused: false, bestPerIteration: [] }));
    pauseRef.current = false;

    const n = distanceMatrix.length;
    const pheromone = inicializarFeromonas(n, 1.0, params.minPheromone);
    
    let globalBest: { tour: number[]; length: number } | null = null;
    const bestPerIteration: number[] = [];

    addLog(`Iniciando ACO: ${params.numHormigas} hormigas, ${params.iteraciones} iteraciones`, 'info');
    addLog(`Parámetros: α=${params.alpha}, β=${params.beta}, ρ=${params.rho}, Q=${params.Q}`, 'info');

    for (let iter = 0; iter < params.iteraciones; iter++) {
      // Check pause
      while (pauseRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!state.isRunning) return globalBest;
      }

      const hormigas = inicializarHormigas(params.numHormigas, 0);
      const solutions: { tour: number[]; length: number }[] = [];

      // Cada hormiga construye su tour
      for (let antIdx = 0; antIdx < hormigas.length; antIdx++) {
        const ant = hormigas[antIdx];

        while (ant.visited.size < n) {
          const { choice, probs } = seleccionarSiguienteNodo(
            ant,
            pheromone,
            distanceMatrix,
            params.alpha,
            params.beta,
            n
          );

          if (choice === -1) break;

          // Update state with current probabilities for visualization
          if (state.isStepMode && onAntStep) {
            setState(prev => ({
              ...prev,
              currentProbabilities: probs,
              currentStep: { ant: antIdx, node: choice }
            }));
            onAntStep(ant, probs);
            
            // Wait for step advance in step mode
            await new Promise<void>(resolve => {
              stepResolveRef.current = resolve;
            });
          }

          ant.tour.push(choice);
          ant.visited.add(choice);
          ant.currentNode = choice;
        }

        ant.length = calcularLongitudRuta(ant.tour, distanceMatrix);
        solutions.push({ tour: [...ant.tour], length: ant.length });

        // Small delay for visualization
        await new Promise(resolve => setTimeout(resolve, 50 / speedMultiplier));
      }

      // Find best of iteration
      let iterBest = solutions[0];
      for (const sol of solutions) {
        if (sol.length < iterBest.length) {
          iterBest = sol;
        }
      }

      if (!globalBest || iterBest.length < globalBest.length) {
        globalBest = { ...iterBest };
        addLog(`Nueva mejor solución en iteración ${iter + 1}: ${Math.round(globalBest.length)}m`, 'success');
      }

      bestPerIteration.push(iterBest.length);
      
      // Update pheromones
      actualizarFeromonas(pheromone, solutions, params.rho, params.Q, params.minPheromone);

      // Update state
      setState(prev => ({
        ...prev,
        pheromone: [...pheromone.map(row => [...row])],
        bestSolution: globalBest,
        bestPerIteration: [...bestPerIteration],
        progress: ((iter + 1) / params.iteraciones) * 100
      }));

      updateMetrics({ 
        bestLength: globalBest?.length || Infinity,
        currentIteration: iter + 1
      });

      if (onIterationComplete) {
        onIterationComplete(iter + 1, iterBest.length, solutions);
      }
    }

    setState(prev => ({ ...prev, isRunning: false }));
    addLog(`ACO completado. Mejor ruta: ${Math.round(globalBest?.length || 0)}m`, 'success');

    return globalBest;
  }, [state.distanceMatrix, state.nodeOrder, state.isStepMode, addLog, updateMetrics]);

  const advanceStep = useCallback(() => {
    if (stepResolveRef.current) {
      stepResolveRef.current();
      stepResolveRef.current = null;
    }
  }, []);

  const togglePause = useCallback(() => {
    pauseRef.current = !pauseRef.current;
    setState(prev => ({ ...prev, isPaused: pauseRef.current }));
  }, []);

  const setStepMode = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isStepMode: enabled }));
  }, []);

  const runNearestNeighborHeuristic = useCallback(() => {
    if (state.distanceMatrix.length === 0) {
      addLog('Error: Primero construya la matriz de distancias', 'error');
      return null;
    }

    const result = runNearestNeighbor(state.distanceMatrix, 0);
    addLog(`Vecino más cercano: ${Math.round(result.length)}m`, 'info');
    return result;
  }, [state.distanceMatrix, addLog]);

  const run2OptHeuristic = useCallback(() => {
    const nnResult = runNearestNeighborHeuristic();
    if (!nnResult) return null;

    const result = run2Opt(nnResult.tour, state.distanceMatrix);
    addLog(`2-opt aplicado: ${Math.round(nnResult.length)}m → ${Math.round(result.length)}m`, 'success');
    return result;
  }, [state.distanceMatrix, runNearestNeighborHeuristic, addLog]);

  const exportResults = useCallback(() => {
    const exportData = {
      distanceMatrix: state.distanceMatrix,
      pheromone: state.pheromone,
      bestSolution: state.bestSolution,
      bestPerIteration: state.bestPerIteration,
      params: {},
      markers: state.nodeOrder.map(n => ({ id: n.id, name: n.name, position: n.position })),
      metrics: state.metrics
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aco_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Resultados exportados a JSON', 'success');
  }, [state, addLog]);

  const reset = useCallback(() => {
    setState(initialState);
    pauseRef.current = false;
  }, []);

  return {
    state,
    setState,
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
  };
}
