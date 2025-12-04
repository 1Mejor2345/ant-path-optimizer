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

export interface SwarmDot {
  id: string;
  position: google.maps.LatLngLiteral;
  color: string;
  size: number;
  opacity: number;
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

// Interpolate between two positions
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPosition(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  t: number
): google.maps.LatLngLiteral {
  return {
    lat: lerp(from.lat, to.lat, t),
    lng: lerp(from.lng, to.lng, t)
  };
}

export function useAntAnimation({ routePolylines, nodeOrder, speed }: UseAntAnimationOptions) {
  const [animatedAnts, setAnimatedAnts] = useState<AnimatedAnt[]>([]);
  const [swarmDots, setSwarmDots] = useState<SwarmDot[]>([]);
  const [pheromoneTrails, setPheromoneTrails] = useState<PheromoneTrail[]>([]);
  const [activePaths, setActivePaths] = useState<AnimatedPath[]>([]);
  const animationRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const speedRef = useRef(speed);
  const activeAnimationsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

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

  // Smooth animation using requestAnimationFrame with interpolation
  const animateSingleAnt = useCallback(async (
    tour: number[],
    color: string,
    emoji: string,
    id: string,
    algorithm: 'aco' | 'nn' = 'aco'
  ): Promise<void> => {
    const fullPath = getFullPath(tour);
    if (fullPath.length === 0) return;

    if (activeAnimationsRef.current.has(id)) {
      return;
    }

    activeAnimationsRef.current.add(id);
    animationRef.current = true;
    
    // Add path for polyline rendering
    setActivePaths(prev => [...prev.filter(p => p.algorithm !== algorithm), { 
      tour, 
      color, 
      emoji, 
      algorithm 
    }]);
    
    const antId = id;
    const totalDuration = 8000 / speedRef.current; // Total animation time
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (currentTime: number) => {
        if (!animationRef.current) {
          setAnimatedAnts(prev => prev.filter(a => a.id !== antId));
          activeAnimationsRef.current.delete(id);
          resolve();
          return;
        }

        if (pausedRef.current) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        // Calculate current position along the path
        const pathProgress = progress * (fullPath.length - 1);
        const currentIndex = Math.floor(pathProgress);
        const nextIndex = Math.min(currentIndex + 1, fullPath.length - 1);
        const segmentProgress = pathProgress - currentIndex;
        
        const currentPos = fullPath[currentIndex];
        const nextPos = fullPath[nextIndex];
        const interpolatedPosition = lerpPosition(currentPos, nextPos, segmentProgress);
        const rotation = calculateRotation(currentPos, nextPos);

        setAnimatedAnts(prev => {
          const filtered = prev.filter(a => a.id !== antId);
          return [...filtered, {
            id: antId,
            position: interpolatedPosition,
            color,
            emoji,
            rotation,
            scale: 1.3
          }];
        });

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete, keep ant visible briefly
          setTimeout(() => {
            setAnimatedAnts(prev => prev.filter(a => a.id !== antId));
            activeAnimationsRef.current.delete(id);
            if (activeAnimationsRef.current.size === 0) {
              animationRef.current = false;
            }
            resolve();
          }, 800);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    });
  }, [routePolylines]);

  // Swarm animation with small dots
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

      // Prepare all ant paths for this iteration
      const antPaths: Array<{
        path: google.maps.LatLngLiteral[];
        tour: number[];
        avgPheromone: number;
      }> = [];

      for (let antIdx = 0; antIdx < numAnts; antIdx++) {
        const tour = getTourForAnt(iter, antIdx);
        const fullPath = getFullPath(tour);
        
        if (fullPath.length === 0) continue;

        // Track edge usage for pheromone visualization
        for (let i = 0; i < tour.length; i++) {
          const from = tour[i];
          const to = tour[(i + 1) % tour.length];
          const edgeKey = `${Math.min(from, to)}_${Math.max(from, to)}`;
          edgeUsage[edgeKey] = (edgeUsage[edgeKey] || 0) + 1;
        }

        // Calculate average pheromone on this path
        let avgPheromone = 0;
        if (pheromoneMatrix) {
          for (let i = 0; i < tour.length; i++) {
            const from = tour[i];
            const to = tour[(i + 1) % tour.length];
            avgPheromone += pheromoneMatrix[from][to];
          }
          avgPheromone /= tour.length;
        }

        antPaths.push({ path: fullPath, tour, avgPheromone });
      }

      // Animate all ants simultaneously as small dots
      const iterationDuration = 400 / speedRef.current;
      const startTime = performance.now();

      await new Promise<void>((resolve) => {
        const animateDots = (currentTime: number) => {
          if (!animationRef.current) {
            setSwarmDots([]);
            resolve();
            return;
          }

          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / iterationDuration, 1);

          const newDots: SwarmDot[] = [];

          antPaths.forEach((antData, antIdx) => {
            const pathProgress = progress * (antData.path.length - 1);
            const currentIndex = Math.floor(pathProgress);
            const nextIndex = Math.min(currentIndex + 1, antData.path.length - 1);
            const segmentProgress = pathProgress - currentIndex;

            const currentPos = antData.path[currentIndex];
            const nextPos = antData.path[nextIndex];
            const position = lerpPosition(currentPos, nextPos, segmentProgress);

            // Color based on pheromone: orange → green
            const normalizedPheromone = pheromoneMatrix 
              ? Math.min(antData.avgPheromone / 5, 1) 
              : iter / iterations;
            const hue = 30 + normalizedPheromone * 90; // 30 (orange) → 120 (green)
            
            newDots.push({
              id: `swarm-${iter}-${antIdx}`,
              position,
              color: `hsl(${hue}, 85%, 50%)`,
              size: 6 + normalizedPheromone * 4,
              opacity: 0.7 + normalizedPheromone * 0.3
            });
          });

          setSwarmDots(newDots);

          if (progress < 1 && animationRef.current) {
            requestAnimationFrame(animateDots);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(animateDots);
      });

      // Update pheromone trails visualization
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

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 80 / speedRef.current));
    }

    setSwarmDots([]);
    animationRef.current = false;
  }, [routePolylines]);

  const stopAnimation = useCallback(() => {
    animationRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    activeAnimationsRef.current.clear();
    setAnimatedAnts([]);
    setSwarmDots([]);
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
    swarmDots,
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
