/**
 * Utilidades para la matriz de distancias completa del campus ESPOL
 * La matriz se construye usando la API de Google Maps y se cachea en localStorage
 */

import { predefinedPlaces, type PredefinedPlace } from './maps-constants';

const CACHE_KEY = 'espol_full_distance_matrix';
const CACHE_VERSION = 'v1';

interface CachedMatrix {
  version: string;
  timestamp: number;
  matrix: number[][];
  polylines: Record<string, { lat: number; lng: number }[]>;
}

// Devuelve todos los lugares en orden
export function getFullNodeOrder(): PredefinedPlace[] {
  return [...predefinedPlaces];
}

// Guarda la matriz en localStorage
export function cacheMatrix(
  matrix: number[][],
  polylines: Record<string, google.maps.LatLngLiteral[]>
): void {
  const cached: CachedMatrix = {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    matrix,
    polylines: polylines as Record<string, { lat: number; lng: number }[]>
  };
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('No se pudo guardar la matriz en cache:', e);
  }
}

// Recupera la matriz del cache si existe y es válida
export function getCachedMatrix(): {
  matrix: number[][];
  polylines: Record<string, google.maps.LatLngLiteral[]>;
} | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedMatrix = JSON.parse(cached);
    
    // Verificar versión
    if (data.version !== CACHE_VERSION) return null;
    
    // Verificar que tiene los 14 puntos
    if (data.matrix.length !== predefinedPlaces.length) return null;
    
    // Cache válido por 30 días
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyDays) return null;
    
    return {
      matrix: data.matrix,
      polylines: data.polylines
    };
  } catch (e) {
    console.warn('Error al leer matriz del cache:', e);
    return null;
  }
}

// Limpia el cache
export function clearMatrixCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

// Verifica si hay una matriz cacheada válida
export function hasCachedMatrix(): boolean {
  return getCachedMatrix() !== null;
}
