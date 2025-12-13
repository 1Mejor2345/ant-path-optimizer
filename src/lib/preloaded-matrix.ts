/**
 * Matriz de distancias precargada para todos los 14 puntos del campus ESPOL
 * Las distancias están en metros y se calcularon usando rutas peatonales reales
 * Esta matriz permite simular ACO con todos los puntos sin esperar llamadas API
 */

import { predefinedPlaces, type PredefinedPlace } from './maps-constants';

// Orden de los lugares en la matriz (mismo orden que predefinedPlaces)
// 0: Admin, 1: Biblioteca, 2: FIEC, 3: FCNM, 4: FADCOM, 5: Coliseo
// 6: FIMCM, 7: FCSH, 8: UBEP, 9: STEM, 10: FIMCP, 11: FICT, 12: SweetCoffee, 13: AlicesFood

// Matriz de distancias aproximadas (en metros) calculadas con rutas peatonales
// Las distancias son simétricas pero pueden variar ligeramente por pendientes/caminos
export const PRELOADED_DISTANCE_MATRIX: number[][] = [
  // Admin (0)
  [0, 165, 450, 320, 280, 85, 200, 520, 520, 465, 350, 260, 300, 180],
  // Biblioteca (1)
  [165, 0, 285, 180, 420, 200, 310, 400, 555, 500, 285, 285, 145, 265],
  // FIEC (2)
  [450, 285, 0, 180, 635, 410, 490, 250, 270, 215, 210, 310, 125, 380],
  // FCNM (3)
  [320, 180, 180, 0, 530, 310, 410, 280, 445, 390, 175, 200, 85, 280],
  // FADCOM (4)
  [280, 420, 635, 530, 0, 220, 290, 720, 430, 480, 475, 380, 520, 270],
  // Coliseo (5)
  [85, 200, 410, 310, 220, 0, 150, 500, 460, 410, 295, 200, 285, 115],
  // FIMCM (6)
  [200, 310, 490, 410, 290, 150, 0, 600, 455, 440, 365, 255, 390, 150],
  // FCSH (7)
  [520, 400, 250, 280, 720, 500, 600, 0, 560, 505, 350, 420, 220, 490],
  // UBEP (8)
  [520, 555, 270, 445, 430, 460, 455, 560, 0, 75, 285, 355, 350, 400],
  // STEM (9)
  [465, 500, 215, 390, 480, 410, 440, 505, 75, 0, 230, 300, 295, 345],
  // FIMCP (10)
  [350, 285, 210, 175, 475, 295, 365, 350, 285, 230, 0, 115, 115, 230],
  // FICT (11)
  [260, 285, 310, 200, 380, 200, 255, 420, 355, 300, 115, 0, 185, 130],
  // SweetCoffee (12)
  [300, 145, 125, 85, 520, 285, 390, 220, 350, 295, 115, 185, 0, 235],
  // AlicesFood (13)
  [180, 265, 380, 280, 270, 115, 150, 490, 400, 345, 230, 130, 235, 0]
];

// Polylines simples (líneas rectas) para la visualización cuando se usa la matriz precargada
export function generatePreloadedPolylines(): Record<string, google.maps.LatLngLiteral[]> {
  const polylines: Record<string, google.maps.LatLngLiteral[]> = {};
  const n = predefinedPlaces.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const edgeKey = `${i}_${j}`;
        polylines[edgeKey] = [
          predefinedPlaces[i].position,
          predefinedPlaces[j].position
        ];
      }
    }
  }
  
  return polylines;
}

// Devuelve todos los lugares en el orden de la matriz
export function getFullNodeOrder(): PredefinedPlace[] {
  return [...predefinedPlaces];
}

// Verifica que la matriz sea válida
export function validatePreloadedMatrix(): boolean {
  const n = PRELOADED_DISTANCE_MATRIX.length;
  if (n !== predefinedPlaces.length) return false;
  
  for (let i = 0; i < n; i++) {
    if (PRELOADED_DISTANCE_MATRIX[i].length !== n) return false;
    if (PRELOADED_DISTANCE_MATRIX[i][i] !== 0) return false;
  }
  
  return true;
}
