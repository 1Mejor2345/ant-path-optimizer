/**
 * Algoritmo de Colonia de Hormigas (ACO) para el Problema del Agente Viajero (TSP)
 * 
 * Este módulo implementa las funciones matemáticas del ACO con documentación
 * pedagógica en español para facilitar la comprensión del algoritmo.
 */

// Tipos de datos
export interface Hormiga {
  tour: number[];
  visited: Set<number>;
  length: number;
  currentNode: number;
}

export interface ACOParams {
  numHormigas: number;
  iteraciones: number;
  alpha: number;      // Peso de las feromonas
  beta: number;       // Peso de la heurística (1/distancia)
  rho: number;        // Tasa de evaporación
  Q: number;          // Constante de depósito de feromonas
  minPheromone: number;
}

export interface ACOState {
  pheromone: number[][];
  distanceMatrix: number[][];
  bestSolution: { tour: number[]; length: number } | null;
  bestPerIteration: number[];
  currentIteration: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface ProbabilityInfo {
  nodeIndex: number;
  probability: number;
  pheromone: number;
  distance: number;
  heuristic: number;
}

/**
 * Inicializa la matriz de feromonas con un valor inicial uniforme.
 * 
 * La feromona inicial τ₀ se establece igual para todas las aristas,
 * permitiendo exploración inicial sin sesgo.
 * 
 * @param n - Número de nodos en el grafo
 * @param initial - Valor inicial de feromona (por defecto 1.0)
 * @param minPheromone - Valor mínimo permitido (evita desaparición total)
 * @returns Matriz n×n de feromonas
 */
export function inicializarFeromonas(
  n: number, 
  initial: number = 1.0, 
  minPheromone: number = 1e-6
): number[][] {
  const pheromone: number[][] = [];
  for (let i = 0; i < n; i++) {
    pheromone[i] = [];
    for (let j = 0; j < n; j++) {
      // Las feromonas en la diagonal son 0 (no hay camino de un nodo a sí mismo)
      pheromone[i][j] = i === j ? 0 : Math.max(initial, minPheromone);
    }
  }
  return pheromone;
}

/**
 * Inicializa las hormigas para una nueva iteración del algoritmo.
 * 
 * Cada hormiga comienza en el nodo de inicio (nodo 0) con su tour vacío
 * y el conjunto de nodos visitados inicializado solo con el nodo de inicio.
 * 
 * @param numAnts - Número de hormigas a crear
 * @param startNode - Nodo de inicio (por defecto 0)
 * @returns Array de hormigas inicializadas
 */
export function inicializarHormigas(numAnts: number, startNode: number = 0): Hormiga[] {
  const hormigas: Hormiga[] = [];
  for (let i = 0; i < numAnts; i++) {
    hormigas.push({
      tour: [startNode],
      visited: new Set([startNode]),
      length: 0,
      currentNode: startNode
    });
  }
  return hormigas;
}

/**
 * Selecciona el siguiente nodo para una hormiga usando la regla de probabilidad ACO.
 * 
 * La probabilidad de elegir el nodo j desde el nodo i es:
 * 
 *         τᵢⱼ^α · ηᵢⱼ^β
 * Pᵢⱼ = ─────────────────
 *       Σₖ (τᵢₖ^α · ηᵢₖ^β)
 * 
 * donde:
 * - τᵢⱼ = nivel de feromona en la arista (i,j)
 * - ηᵢⱼ = 1/dᵢⱼ = heurística (inverso de la distancia)
 * - α = peso de la feromona (importancia de la experiencia colectiva)
 * - β = peso de la heurística (importancia de la información local)
 * 
 * @param ant - Hormiga actual
 * @param pheromone - Matriz de feromonas
 * @param distanceMatrix - Matriz de distancias
 * @param alpha - Exponente de feromona
 * @param beta - Exponente de heurística
 * @param n - Número total de nodos
 * @returns Objeto con el nodo elegido y las probabilidades calculadas
 */
export function seleccionarSiguienteNodo(
  ant: Hormiga,
  pheromone: number[][],
  distanceMatrix: number[][],
  alpha: number,
  beta: number,
  n: number
): { choice: number; probs: ProbabilityInfo[] } {
  const currentNode = ant.currentNode;
  const probs: ProbabilityInfo[] = [];
  let sum = 0;

  // Calcular el numerador de la probabilidad para cada nodo no visitado
  for (let j = 0; j < n; j++) {
    if (!ant.visited.has(j)) {
      const tau = pheromone[currentNode][j];
      const distance = distanceMatrix[currentNode][j];
      
      // Evitar división por cero
      if (distance <= 0) continue;
      
      const eta = 1 / distance;  // Heurística: inverso de la distancia
      const value = Math.pow(tau, alpha) * Math.pow(eta, beta);
      
      probs.push({
        nodeIndex: j,
        probability: value,  // Se normalizará después
        pheromone: tau,
        distance: distance,
        heuristic: eta
      });
      
      sum += value;
    }
  }

  // Si no hay nodos disponibles o suma es cero, elegir aleatorio entre no visitados
  if (probs.length === 0 || sum === 0) {
    const unvisited = [];
    for (let j = 0; j < n; j++) {
      if (!ant.visited.has(j)) unvisited.push(j);
    }
    if (unvisited.length === 0) {
      return { choice: -1, probs: [] };
    }
    const randomChoice = unvisited[Math.floor(Math.random() * unvisited.length)];
    return { 
      choice: randomChoice, 
      probs: probs.map(p => ({ ...p, probability: 1 / probs.length }))
    };
  }

  // Normalizar probabilidades (dividir por la suma)
  for (const prob of probs) {
    prob.probability = prob.probability / sum;
  }

  // Selección por ruleta: generar número aleatorio y acumular probabilidades
  const random = Math.random();
  let cumulative = 0;
  
  for (const prob of probs) {
    cumulative += prob.probability;
    if (random <= cumulative) {
      return { choice: prob.nodeIndex, probs };
    }
  }

  // Fallback: retornar el último nodo
  return { choice: probs[probs.length - 1].nodeIndex, probs };
}

/**
 * Calcula la longitud total de una ruta (tour).
 * 
 * La longitud se calcula sumando las distancias entre nodos consecutivos
 * y cerrando el ciclo (volviendo al nodo inicial).
 * 
 * @param tour - Array de índices de nodos en orden de visita
 * @param distanceMatrix - Matriz de distancias
 * @returns Longitud total del tour en metros
 */
export function calcularLongitudRuta(tour: number[], distanceMatrix: number[][]): number {
  let length = 0;
  
  for (let i = 0; i < tour.length - 1; i++) {
    length += distanceMatrix[tour[i]][tour[i + 1]];
  }
  
  // Cerrar el ciclo: volver al nodo inicial
  if (tour.length > 0) {
    length += distanceMatrix[tour[tour.length - 1]][tour[0]];
  }
  
  return length;
}

/**
 * Deposita feromonas en las aristas recorridas por las hormigas.
 * 
 * Cada hormiga deposita una cantidad de feromona inversamente proporcional
 * a la longitud de su tour:
 * 
 * Δτᵢⱼ = Q / Lₖ
 * 
 * donde Q es una constante y Lₖ es la longitud del tour de la hormiga k.
 * 
 * @param solutions - Array de soluciones (tours y longitudes)
 * @param pheromone - Matriz de feromonas a actualizar
 * @param Q - Constante de depósito
 * @param minPheromone - Valor mínimo de feromona
 */
export function depositarFeromonas(
  solutions: { tour: number[]; length: number }[],
  pheromone: number[][],
  Q: number,
  minPheromone: number
): void {
  for (const solution of solutions) {
    if (solution.length <= 0) continue;
    
    const delta = Q / solution.length;
    const tour = solution.tour;
    
    // Depositar en cada arista del tour
    for (let i = 0; i < tour.length - 1; i++) {
      const from = tour[i];
      const to = tour[i + 1];
      pheromone[from][to] = Math.max(pheromone[from][to] + delta, minPheromone);
      pheromone[to][from] = Math.max(pheromone[to][from] + delta, minPheromone); // Simétrico
    }
    
    // Cerrar el ciclo
    if (tour.length > 0) {
      const from = tour[tour.length - 1];
      const to = tour[0];
      pheromone[from][to] = Math.max(pheromone[from][to] + delta, minPheromone);
      pheromone[to][from] = Math.max(pheromone[to][from] + delta, minPheromone);
    }
  }
}

/**
 * Aplica la evaporación de feromonas en toda la matriz.
 * 
 * La evaporación simula el decaimiento natural de las feromonas:
 * 
 * τᵢⱼ ← (1 - ρ) · τᵢⱼ
 * 
 * donde ρ ∈ [0,1] es la tasa de evaporación.
 * 
 * @param pheromone - Matriz de feromonas a actualizar
 * @param rho - Tasa de evaporación (0-1)
 * @param minPheromone - Valor mínimo de feromona (evita desaparición total)
 */
export function evaporarFeromonas(
  pheromone: number[][],
  rho: number,
  minPheromone: number
): void {
  const n = pheromone.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        pheromone[i][j] = Math.max(pheromone[i][j] * (1 - rho), minPheromone);
      }
    }
  }
}

/**
 * Actualiza la matriz de feromonas: primero evapora, luego deposita.
 * 
 * Este es el ciclo completo de actualización de feromonas que ocurre
 * al final de cada iteración del algoritmo.
 * 
 * @param pheromone - Matriz de feromonas
 * @param solutions - Soluciones de la iteración actual
 * @param rho - Tasa de evaporación
 * @param Q - Constante de depósito
 * @param minPheromone - Valor mínimo de feromona
 */
export function actualizarFeromonas(
  pheromone: number[][],
  solutions: { tour: number[]; length: number }[],
  rho: number,
  Q: number,
  minPheromone: number
): void {
  evaporarFeromonas(pheromone, rho, minPheromone);
  depositarFeromonas(solutions, pheromone, Q, minPheromone);
}

/**
 * Ejecuta el algoritmo del Vecino Más Cercano (Nearest Neighbor).
 * 
 * Heurística voraz que siempre selecciona el nodo no visitado más cercano.
 * Proporciona una solución rápida pero generalmente subóptima.
 * 
 * @param distanceMatrix - Matriz de distancias
 * @param startNode - Nodo de inicio
 * @returns Tour y su longitud
 */
export function runNearestNeighbor(
  distanceMatrix: number[][],
  startNode: number = 0
): { tour: number[]; length: number } {
  const n = distanceMatrix.length;
  const visited = new Set<number>([startNode]);
  const tour = [startNode];
  let current = startNode;

  while (visited.size < n) {
    let nearestNode = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && distanceMatrix[current][j] < nearestDist) {
        nearestDist = distanceMatrix[current][j];
        nearestNode = j;
      }
    }

    if (nearestNode === -1) break;
    
    tour.push(nearestNode);
    visited.add(nearestNode);
    current = nearestNode;
  }

  const length = calcularLongitudRuta(tour, distanceMatrix);
  return { tour, length };
}

/**
 * Aplica la optimización 2-opt a un tour existente.
 * 
 * 2-opt es una técnica de mejora local que intercambia dos aristas
 * del tour si el intercambio reduce la longitud total.
 * 
 * @param tour - Tour inicial
 * @param distanceMatrix - Matriz de distancias
 * @returns Tour mejorado y su longitud
 */
export function run2Opt(
  tour: number[],
  distanceMatrix: number[][]
): { tour: number[]; length: number } {
  let improved = true;
  let currentTour = [...tour];
  
  while (improved) {
    improved = false;
    
    for (let i = 0; i < currentTour.length - 1; i++) {
      for (let j = i + 2; j < currentTour.length; j++) {
        // Calcular el cambio de distancia si intercambiamos aristas
        const a = currentTour[i];
        const b = currentTour[i + 1];
        const c = currentTour[j];
        const d = currentTour[(j + 1) % currentTour.length];
        
        const currentDist = distanceMatrix[a][b] + distanceMatrix[c][d];
        const newDist = distanceMatrix[a][c] + distanceMatrix[b][d];
        
        if (newDist < currentDist) {
          // Invertir la subsección entre i+1 y j
          const newTour = [
            ...currentTour.slice(0, i + 1),
            ...currentTour.slice(i + 1, j + 1).reverse(),
            ...currentTour.slice(j + 1)
          ];
          currentTour = newTour;
          improved = true;
        }
      }
    }
  }
  
  const length = calcularLongitudRuta(currentTour, distanceMatrix);
  return { tour: currentTour, length };
}

/**
 * Calcula la distancia Haversine entre dos puntos geográficos.
 * 
 * Se usa como fallback cuando la API de Directions no está disponible.
 * 
 * @param lat1 - Latitud del punto 1
 * @param lng1 - Longitud del punto 1
 * @param lat2 - Latitud del punto 2
 * @param lng2 - Longitud del punto 2
 * @returns Distancia en metros
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}
