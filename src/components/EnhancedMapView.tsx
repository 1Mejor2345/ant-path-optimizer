import { useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Polyline, OverlayView } from '@react-google-maps/api';
import { CAMPUS_CENTER, MAP_ID, type PredefinedPlace } from '@/lib/maps-constants';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { type AnimatedAnt, type AnimatedPath, type SwarmDot } from '@/hooks/useAntAnimation';

interface EnhancedMapViewProps {
  nodeOrder: PredefinedPlace[];
  routePolylines: Record<string, google.maps.LatLngLiteral[]>;
  fallbackEdges: Set<string>;
  pheromone: number[][];
  bestSolution: { tour: number[]; length: number } | null;
  showPheromoneMap: boolean;
  showBestRoute: boolean;
  bestRouteColor?: string;
  animatedAnts: AnimatedAnt[];
  swarmDots: SwarmDot[];
  pheromoneTrails: Array<{
    path: google.maps.LatLngLiteral[];
    intensity: number;
  }>;
  activePaths: AnimatedPath[];
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

export function EnhancedMapView({
  nodeOrder,
  routePolylines,
  fallbackEdges,
  pheromone,
  bestSolution,
  showPheromoneMap,
  showBestRoute,
  bestRouteColor = '#10b981',
  animatedAnts,
  swarmDots,
  pheromoneTrails,
  activePaths
}: EnhancedMapViewProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  // Calculate pheromone intensity for edge coloring
  const maxPheromone = useMemo(() => {
    if (pheromone.length === 0) return 1;
    let max = 0;
    for (const row of pheromone) {
      for (const val of row) {
        if (val > max) max = val;
      }
    }
    return max || 1;
  }, [pheromone]);

  // Render pheromone edges with dynamic intensity
  const pheromoneEdges = useMemo(() => {
    if (!showPheromoneMap || pheromone.length === 0 || Object.keys(routePolylines).length === 0) {
      return null;
    }

    const edges: JSX.Element[] = [];
    const n = pheromone.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const edgeKey = `${i}_${j}`;
        const reverseKey = `${j}_${i}`;
        const path = routePolylines[edgeKey] || routePolylines[reverseKey];
        
        if (!path) continue;
        
        const isFallback = fallbackEdges.has(edgeKey) || fallbackEdges.has(reverseKey);
        if (isFallback) continue;

        const intensity = (pheromone[i][j] + pheromone[j][i]) / 2;
        const normalized = Math.min(intensity / maxPheromone, 1);
        
        // Dynamic color: starts faint blue, becomes bright green as intensity increases
        const hue = 200 - normalized * 80; // 200=blue to 120=green
        const saturation = 50 + normalized * 30;
        const lightness = 60 - normalized * 15;
        const opacity = 0.15 + normalized * 0.7;
        const weight = 1 + normalized * 8;

        edges.push(
          <Polyline
            key={edgeKey}
            path={path}
            options={{
              strokeColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
              strokeOpacity: opacity,
              strokeWeight: weight,
              geodesic: true
            }}
          />
        );
      }
    }

    return edges;
  }, [showPheromoneMap, pheromone, routePolylines, fallbackEdges, maxPheromone]);

  // Render real-time pheromone trails from ants
  const trailPolylines = useMemo(() => {
    return pheromoneTrails.map((trail, idx) => (
      <Polyline
        key={`trail-${idx}`}
        path={trail.path}
        options={{
          strokeColor: `hsl(${120 + trail.intensity * 60}, 70%, ${45 + trail.intensity * 15}%)`,
          strokeOpacity: 0.4 + trail.intensity * 0.4,
          strokeWeight: 2 + trail.intensity * 6,
          geodesic: true
        }}
      />
    ));
  }, [pheromoneTrails]);

  // Helper to get full path for a tour
  const getFullPathForTour = (tour: number[]) => {
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
    return fullPath;
  };

  // Render animated paths with arrows
  const animatedPathPolylines = useMemo(() => {
    if (activePaths.length === 0) return null;

    return activePaths.map((pathData, idx) => {
      const fullPath = getFullPathForTour(pathData.tour);
      if (fullPath.length === 0) return null;

      // Define arrow symbols
      const arrowSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3.5,
        strokeColor: pathData.color,
        strokeWeight: 2,
        fillColor: pathData.color,
        fillOpacity: 1
      };

      return (
        <Polyline
          key={`animated-path-${pathData.algorithm}-${idx}`}
          path={fullPath}
          options={{
            strokeColor: pathData.color,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            geodesic: true,
            zIndex: 150,
            icons: [{
              icon: arrowSymbol,
              offset: '0',
              repeat: '60px'
            }]
          }}
        />
      );
    });
  }, [activePaths, routePolylines]);

  // Render best route (legacy support)
  const bestRoutePolyline = useMemo(() => {
    if (!showBestRoute || !bestSolution || bestSolution.tour.length === 0) {
      return null;
    }

    const fullPath = getFullPathForTour(bestSolution.tour);

    return (
      <Polyline
        path={fullPath}
        options={{
          strokeColor: bestRouteColor,
          strokeOpacity: 1,
          strokeWeight: 5,
          geodesic: true,
          zIndex: 100
        }}
      />
    );
  }, [showBestRoute, bestSolution, routePolylines, bestRouteColor]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
        mapRef.current.setCenter(CAMPUS_CENTER);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl">
        <div className="text-center p-8">
          <p className="text-destructive font-semibold mb-2">Error al cargar Google Maps</p>
          <p className="text-sm text-muted-foreground">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🐜</div>
          <p className="text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-xl border border-border/50">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={CAMPUS_CENTER}
        zoom={16}
        onLoad={onLoad}
        options={{
          mapId: MAP_ID,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        }}
      >
        {/* Pheromone trails from ant movement */}
        {trailPolylines}

        {/* Pheromone edges */}
        {pheromoneEdges}

        {/* Animated paths with arrows */}
        {animatedPathPolylines}

        {/* Best route (legacy) */}
        {bestRoutePolyline}

        {/* Node markers with NAMES */}
        {nodeOrder.map((place, index) => (
          <OverlayView
            key={place.id}
            position={place.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative transform -translate-x-1/2 -translate-y-1/2">
              {/* Marker circle */}
              <div className="w-8 h-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                {index + 1}
              </div>
              {/* Name label below */}
              <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="bg-card/95 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium shadow-md border border-border/50 text-foreground">
                  {place.name.length > 18 ? place.name.substring(0, 18) + '...' : place.name}
                </div>
              </div>
            </div>
          </OverlayView>
        ))}

        {/* Swarm dots (visible during ACO execution) */}
        {swarmDots.map((dot) => (
          <OverlayView
            key={dot.id}
            position={dot.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div 
              className="rounded-full animate-pulse"
              style={{ 
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: dot.color,
                opacity: dot.opacity,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${dot.size + 4}px ${dot.color}, 0 0 ${dot.size * 2}px ${dot.color}40`,
                border: '1px solid rgba(255,255,255,0.5)'
              }}
            />
          </OverlayView>
        ))}

        {/* Single animated ants (for final route display) - smooth movement */}
        {animatedAnts.map((ant) => (
          <OverlayView
            key={ant.id}
            position={ant.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div 
              className="relative"
              style={{ 
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div 
                style={{ 
                  transform: `rotate(${ant.rotation || 0}deg) scale(${ant.scale || 1})`,
                  fontSize: '28px',
                  filter: `drop-shadow(0 2px 6px ${ant.color})`,
                  transition: 'none'
                }}
              >
                {ant.emoji}
              </div>
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-full blur-md -z-10"
                style={{ 
                  backgroundColor: ant.color, 
                  transform: 'scale(1.8)',
                  opacity: 0.5
                }}
              />
            </div>
          </OverlayView>
        ))}
      </GoogleMap>
    </div>
  );
}
