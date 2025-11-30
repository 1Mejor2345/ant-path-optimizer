import { useState, useCallback, useRef } from 'react';
import { type PredefinedPlace } from '@/lib/maps-constants';

export interface AnimatedAnt {
  id: string;
  position: google.maps.LatLngLiteral;
  color: string;
  emoji: string;
  rotation?: number;
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
  const animationRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const speedRef = useRef(speed);

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
    id: string
  ): Promise<void> => {
    const fullPath = getFullPath(tour);
    if (fullPath.length === 0) return;

    animationRef.current = true;
    
    const antId = id;
    const baseDuration = 8000;
    const stepDuration = baseDuration / fullPath.length;

    for (let i = 0; i < fullPath.length && animationRef.current; i++) {
      while (pausedRef.current && animationRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (!animationRef.current) break;

      const position = fullPath[i];
      const nextPosition = fullPath[Math.min(i + 1, fullPath.length - 1)];
      const rotation = calculateRotation(position, nextPosition);

      setAnimatedAnts([{
        id: antId,
        position,
        color,
        emoji,
        rotation
      }]);

      await new Promise(resolve => setTimeout(resolve, stepDuration / speedRef.current));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    setAnimatedAnts([]);
    animationRef.current = false;
  }, [routePolylines]);

  const animateSwarm = useCallback(async (
    iterations: number,
    numAnts: number,
    getTourForAnt: (iteration: number, antIndex: number) => number[],
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
      
      for (let antIdx = 0; antIdx < numAnts; antIdx++) {
        const tour = getTourForAnt(iter, antIdx);
        const fullPath = getFullPath(tour);
        
        if (fullPath.length === 0) continue;

        for (let i = 0; i < tour.length; i++) {
          const from = tour[i];
          const to = tour[(i + 1) % tour.length];
          const edgeKey = `${Math.min(from, to)}_${Math.max(from, to)}`;
          edgeUsage[edgeKey] = (edgeUsage[edgeKey] || 0) + 1;
        }

        const antId = `swarm-${iter}-${antIdx}`;
        const hue = (antIdx * 30) % 360;
        
        antPromises.push(
          animateAntQuickly(fullPath, antId, `hsl(${hue}, 70%, 50%)`, antIdx)
        );
      }

      await Promise.all(antPromises);

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

      await new Promise(resolve => setTimeout(resolve, 200 / speedRef.current));
    }

    setSwarmAnts([]);
    animationRef.current = false;
  }, [routePolylines]);

  const animateAntQuickly = async (
    path: google.maps.LatLngLiteral[],
    id: string,
    color: string,
    index: number
  ): Promise<void> => {
    const emoji = '\uD83D\uDC1C';
    const stepSize = Math.max(1, Math.floor(path.length / 20));
    const stepDuration = 50;

    for (let i = 0; i < path.length && animationRef.current; i += stepSize) {
      const position = path[i];
      const nextPosition = path[Math.min(i + stepSize, path.length - 1)];
      const rotation = calculateRotation(position, nextPosition);

      setSwarmAnts(prev => {
        const existing = prev.filter(a => a.id !== id);
        return [...existing, { id, position, color, emoji, rotation }];
      });

      await new Promise(resolve => setTimeout(resolve, stepDuration / speedRef.current));
    }

    setSwarmAnts(prev => prev.filter(a => a.id !== id));
  };

  const stopAnimation = useCallback(() => {
    animationRef.current = false;
    setAnimatedAnts([]);
    setSwarmAnts([]);
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

  return {
    animatedAnts,
    swarmAnts,
    pheromoneTrails,
    animateSingleAnt,
    animateSwarm,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    clearTrails,
    isAnimating: animationRef.current
  };
}
