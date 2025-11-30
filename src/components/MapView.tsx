import { useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api';
import { CAMPUS_CENTER, type PredefinedPlace } from '@/lib/maps-constants';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface MapViewProps {
  nodeOrder: PredefinedPlace[];
  routePolylines: Record<string, google.maps.LatLngLiteral[]>;
  fallbackEdges: Set<string>;
  showFallbacks: boolean;
  pheromone: number[][];
  bestSolution: { tour: number[]; length: number } | null;
  showPheromoneMap: boolean;
  showBestRoute: boolean;
  animatedAntPosition: google.maps.LatLngLiteral | null;
  isFullscreen: boolean;
}

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};

export function MapView({
  nodeOrder,
  routePolylines,
  fallbackEdges,
  showFallbacks,
  pheromone,
  bestSolution,
  showPheromoneMap,
  showBestRoute,
  animatedAntPosition,
  isFullscreen
}: MapViewProps) {
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

  // Render pheromone edges
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
        if (isFallback && !showFallbacks) continue;

        const intensity = (pheromone[i][j] + pheromone[j][i]) / 2;
        const normalized = Math.min(intensity / maxPheromone, 1);
        
        // Color interpolation from blue (low) to green (high)
        const hue = 160 + (200 - 160) * (1 - normalized); // 200=blue, 160=green
        const opacity = 0.2 + normalized * 0.6;
        const weight = 1 + normalized * 5;

        edges.push(
          <Polyline
            key={edgeKey}
            path={path}
            options={{
              strokeColor: `hsl(${hue}, 70%, 50%)`,
              strokeOpacity: opacity,
              strokeWeight: weight,
              geodesic: true,
              ...(isFallback ? {
                strokeOpacity: opacity * 0.5,
                icons: [{
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                  offset: '0',
                  repeat: '10px'
                }]
              } : {})
            }}
          />
        );
      }
    }

    return edges;
  }, [showPheromoneMap, pheromone, routePolylines, fallbackEdges, showFallbacks, maxPheromone]);

  // Render best route
  const bestRoutePolyline = useMemo(() => {
    if (!showBestRoute || !bestSolution || bestSolution.tour.length === 0) {
      return null;
    }

    const fullPath: google.maps.LatLngLiteral[] = [];
    const tour = bestSolution.tour;

    for (let i = 0; i < tour.length; i++) {
      const from = tour[i];
      const to = tour[(i + 1) % tour.length];
      const edgeKey = `${from}_${to}`;
      const reverseKey = `${to}_${from}`;
      const path = routePolylines[edgeKey] || routePolylines[reverseKey];
      
      if (path) {
        // Reverse path if needed
        const shouldReverse = !routePolylines[edgeKey] && routePolylines[reverseKey];
        const orderedPath = shouldReverse ? [...path].reverse() : path;
        fullPath.push(...orderedPath);
      }
    }

    return (
      <Polyline
        path={fullPath}
        options={{
          strokeColor: '#10b981', // secondary/green
          strokeOpacity: 1,
          strokeWeight: 4,
          geodesic: true,
          zIndex: 100
        }}
      />
    );
  }, [showBestRoute, bestSolution, routePolylines]);

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

  // Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
        mapRef.current.setCenter(CAMPUS_CENTER);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px] bg-muted rounded-xl">
        <div className="text-center p-8">
          <p className="text-destructive font-semibold mb-2">Error al cargar Google Maps</p>
          <p className="text-sm text-muted-foreground">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px] bg-muted rounded-xl">
        <div className="text-center">
          <div className="ant-emoji text-4xl mb-4">🐜</div>
          <p className="text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={CAMPUS_CENTER}
        zoom={16}
        onLoad={onLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        }}
      >
        {/* Node markers */}
        {nodeOrder.map((place, index) => (
          <Marker
            key={place.id}
            position={place.position}
            label={{
              text: String(index + 1),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#0ea5e9',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            }}
            title={place.name}
          />
        ))}

        {/* Pheromone edges */}
        {pheromoneEdges}

        {/* Best route */}
        {bestRoutePolyline}

        {/* Animated ant marker */}
        {animatedAntPosition && (
          <Marker
            position={animatedAntPosition}
            icon={{
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 100 100">
                  <text y="80" font-size="80">🐜</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 16)
            }}
            zIndex={1000}
          />
        )}
      </GoogleMap>
    </div>
  );
}
