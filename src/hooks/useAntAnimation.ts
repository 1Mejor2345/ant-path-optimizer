import { useState, useCallback, useRef } from 'react';
import { type PredefinedPlace } from '@/lib/maps-constants';

export interface AnimatedAnt {
  id: string;
  position: google.maps.LatLngLiteral;
  color: string;
  emoji: string;
  rotation?: number;
  scale?: number;
}

export interface AnimatedPath {
  tour: number[];
  color: string;
  emoji: string;
  algorithm: 'aco' | 'nn';
}

export interface PheromoneTrail {
  path: google.maps.LatLngLiteral[];
  intensity: number;
}

interface UseAntAnimationOptions {
  routePolylines: Record<string, google.maps.LatLngLiteral[]>;
  nodeOrder: PredefinedPlace[];
  speed: number;
}

export function useAntAnimation({ routePolylines, nodeOrder, speed }: UseAntAnimationOptions) {
  const [animatedAnts, setAnimatedAnts] = useState<AnimatedAnt[]>([]);
  const [swarmAnts, setSwarmAnts] = useState<AnimatedAnt[]>([]);
  const [pheromoneTrails, setPheromoneTrails] = useState<PheromoneTrail[]>([]);
  const [activePaths, setActivePaths] = useState<AnimatedPath[]>([]);
  const animationRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const speedRef = useRef(speed);
  const activeAnimationsRef = useRef<Set<string>>(new Set());

  speedRef.current = speed;

  const calculateRotation = (from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral): number => {
    const dx = to.lng - from.lng;
    const dy = to.lat - from.lat;
    return Math.atan2(dx, dy) * (180 / Math.PI);
  };

  const getPathForEdge = (from: number, to: number): google.maps.LatLngLiteral[] => {
    const edgeKey = `${from}_${to}`;
    const reverseKey = `${to}_${from}`;
    const path = routePolylines[edgeKey] || routePolylines[reverseKey];
    
    if (!path) return [];
    
    const shouldReverse = !routePolylines[edgeKey] && routePolylines[reverseKey];
    return shouldReverse ? [...path].reverse() : path;
  };

  const getFullPath = (tour: number[]): google.maps.LatLngLiteral[] => {
    const fullPath: google.maps.LatLngLiteral[] = [];
    
    for (let i = 0; i < tour.length; i++) {
      const from = tour[i];
      const to = tour[(i + 1) % tour.length];
      const segmentPath = getPathForEdge(from, to);
      fullPath.push(...segmentPath);
    }
    
    return fullPath;
  };

  const animateSingleAnt = useCallback(async (
    tour: number[],
    color: string,
    emoji: string,
    id: string,
    algorithm: 'aco' | 'nn' = 'aco'
  ): Promise<void> => {
    const fullPath = getFullPath(tour);
    if (fullPath.length === 0) return;

    // Check if this animation is already running
    if (activeAnimationsRef.current.has(id)) {
      return;
    }

    activeAnimationsRef.current.add(id);
    animationRef.current = true;
    
    // Add this path to active paths for polyline rendering
    setActivePaths(prev => [...prev.filter(p => p.algorithm !== algorithm), { 
      tour, 
      color, 
      emoji, 
      algorithm 
    }]);
    
    const antId = id;
    const baseDuration = 6000; // Faster animation
    const stepDuration = baseDuration / fullPath.length;

    for (let i = 0; i < fullPath.length && animationRef.current; i++) {
      while (pausedRef.current && animationRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (!animationRef.current) break;

      const position = fullPath[i];
      const nextPosition = fullPath[Math.min(i + 1, fullPath.length - 1)];
      const rotation = calculateRotation(position, nextPosition);

      setAnimatedAnts(prev => {
        const filtered = prev.filter(a => a.id !== antId);
        return [...filtered, {
          id: antId,
          position,
          color,
          emoji,
          rotation,
          scale: 1.2
        }];
      });

      await new Promise(resolve => setTimeout(resolve, stepDuration / speedRef.current));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setAnimatedAnts(prev => prev.filter(a => a.id !== antId));
    activeAnimationsRef.current.delete(id);
    if (activeAnimationsRef.current.size === 0) {
      animationRef.current = false;
    }
  }, [routePolylines]);

  const animateSwarm = useCallback(async (
    iterations: number,
    numAnts: number,
    getTourForAnt: (iteration: number, antIndex: number) => number[],
    pheromoneMatrix: number[][] | null,
    onIterationComplete?: (iteration: number) => void
  ): Promise<void> => {
    animationRef.current = true;
    const edgeUsage: Record<string, number> = {};

    for (let iter = 0; iter < iterations && animationRef.current; iter++) {
      while (pausedRef.current && animationRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (!animationRef.current) break;

      const antPromises = [];
      
      // More ants per iteration for better visualization
      for (let antIdx = 0; antIdx < numAnts; antIdx++) {
        const tour = getTourForAnt(iter, antIdx);
        const fullPath = getFullPath(tour);
        
        if (fullPath.length === 0) continue;

        // Track edge usage
        for (let i = 0; i < tour.length; i++) {
          const from = tour[i];
          const to = tour[(i + 1) % tour.length];
          const edgeKey = `${Math.min(from, to)}_${Math.max(from, to)}`;
          edgeUsage[edgeKey] = (edgeUsage[edgeKey] || 0) + 1;
        }

        const antId = `swarm-${iter}-${antIdx}`;
        
        // Color based on pheromone preference
        let avgPheromone = 0;
        if (pheromoneMatrix) {
          for (let i = 0; i < tour.length; i++) {
            const from = tour[i];
            const to = tour[(i + 1) % tour.length];
            avgPheromone += pheromoneMatrix[from][to];
          }
          avgPheromone /= tour.length;
        }
        
        // Green for high pheromone, yellow/orange for low
        const hue = 40 + avgPheromone * 80; // 40 (orange) to 120 (green)
        const color = `hsl(${hue}, 80%, 50%)`;
        
        antPromises.push(
          animateAntQuickly(fullPath, antId, color, antIdx, iter, iterations)
        );
      }

      await Promise.all(antPromises);

      // Update pheromone trails
      const maxUsage = Math.max(...Object.values(edgeUsage), 1);
      const newTrails: PheromoneTrail[] = [];
      
      for (const [edgeKey, usage] of Object.entries(edgeUsage)) {
        const [from, to] = edgeKey.split('_').map(Number);
        const path = getPathForEdge(from, to);
        if (path.length > 0) {
          newTrails.push({
            path,
            intensity: Math.min(usage / maxUsage, 1)
          });
        }
      }
      
      setPheromoneTrails(newTrails);

      if (onIterationComplete) {
        onIterationComplete(iter + 1);
      }

      // Faster iterations
      await new Promise(resolve => setTimeout(resolve, 150 / speedRef.current));
    }

    setSwarmAnts([]);
    animationRef.current = false;
  }, [routePolylines]);

  const animateAntQuickly = async (
    path: google.maps.LatLngLiteral[],
    id: string,
    color: string,
    index: number,
    iteration: number,
    totalIterations: number
  ): Promise<void> => {
    const emoji = '\uD83D\uDC1C';
    // Much smaller steps for smoother, faster animation
    const stepSize = Math.max(1, Math.floor(path.length / 40));
    const stepDuration = 30; // Faster
    
    // Scale gets smaller as iterations progress (convergence effect)
    const baseScale = 0.5 + (0.5 * (1 - iteration / totalIterations));

    for (let i = 0; i < path.length && animationRef.current; i += stepSize) {
      const position = path[i];
      const nextPosition = path[Math.min(i + stepSize, path.length - 1)];
      const rotation = calculateRotation(position, nextPosition);

      setSwarmAnts(prev => {
        const existing = prev.filter(a => a.id !== id);
        return [...existing, { 
          id, 
          position, 
          color, 
          emoji, 
          rotation,
          scale: baseScale 
        }];
      });

      await new Promise(resolve => setTimeout(resolve, stepDuration / speedRef.current));
    }

    setSwarmAnts(prev => prev.filter(a => a.id !== id));
  };

  const stopAnimation = useCallback(() => {
    animationRef.current = false;
    activeAnimationsRef.current.clear();
    setAnimatedAnts([]);
    setSwarmAnts([]);
    setActivePaths([]);
  }, []);

  const pauseAnimation = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeAnimation = useCallback(() => {
    pausedRef.current = false;
  }, []);

  const clearTrails = useCallback(() => {
    setPheromoneTrails([]);
  }, []);

  const clearPaths = useCallback(() => {
    setActivePaths([]);
  }, []);

  return {
    animatedAnts,
    swarmAnts,
    pheromoneTrails,
    activePaths,
    animateSingleAnt,
    animateSwarm,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    clearTrails,
    clearPaths,
    isAnimating: animationRef.current
  };
}
