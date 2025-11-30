/**
 * Constantes para Google Maps API
 * Configuración del campus ESPOL y ubicaciones predefinidas
 */

export const GOOGLE_MAPS_API_KEY = 'AIzaSyDa-gqDqNUmwyKvuZf-lJD7l3-GRhrca44';
export const MAP_ID = '2511f38191a761cab0d50086';
export const CAMPUS_CENTER = { lat: -2.14668, lng: -79.96444 };

export interface PredefinedPlace {
  id: string;
  name: string;
  position: { lat: number; lng: number };
}

/**
 * Las 14 ubicaciones predefinidas en el campus ESPOL
 * Incluye facultades, edificios administrativos y puntos de comida
 */
export const predefinedPlaces: PredefinedPlace[] = [
  {
    id: 'Admin',
    name: 'Administración / Rectorado',
    position: { lat: -2.147423925708391, lng: -79.96445212447314 }
  },
  {
    id: 'Biblioteca',
    name: 'Biblioteca Central',
    position: { lat: -2.147477816522214, lng: -79.96593456064703 }
  },
  {
    id: 'FIEC',
    name: 'FIEC',
    position: { lat: -2.1446131345363892, lng: -79.9678766570473 }
  },
  {
    id: 'FCNM',
    name: 'FCNM',
    position: { lat: -2.1468411799472746, lng: -79.96712596903747 }
  },
  {
    id: 'FADCOM',
    name: 'FADCOM',
    position: { lat: -2.1440652686981694, lng: -79.96231614220868 }
  },
  {
    id: 'Coliseo',
    name: 'Coliseo ESPOL',
    position: { lat: -2.1450859240594675, lng: -79.9643019859674 }
  },
  {
    id: 'FIMCM',
    name: 'FIMCM',
    position: { lat: -2.1466902114028006, lng: -79.96328517123769 }
  },
  {
    id: 'FCSH',
    name: 'FCSH',
    position: { lat: -2.1476325410881176, lng: -79.9686379564136 }
  },
  {
    id: 'UBEP',
    name: 'UBEP',
    position: { lat: -2.142855393644157, lng: -79.96714122010141 }
  },
  {
    id: 'STEM',
    name: 'STEM (Edificio de Posgrados)',
    position: { lat: -2.143375584813157, lng: -79.96649445324205 }
  },
  {
    id: 'FIMCP',
    name: 'FIMCP',
    position: { lat: -2.144619259136839, lng: -79.96589363500573 }
  },
  {
    id: 'FICT',
    name: 'FICT',
    position: { lat: -2.1455348949876907, lng: -79.96538692585148 }
  },
  {
    id: 'SweetCoffee',
    name: 'Sweet & Coffee - ESPOL (cafetería)',
    position: { lat: -2.146134750364379, lng: -79.9668032316627 }
  },
  {
    id: 'AlicesFood',
    name: "Alice's Food (otro punto de comida)",
    position: { lat: -2.1463377942469855, lng: -79.96470002935152 }
  }
];

export const DEFAULT_ACO_PARAMS = {
  numHormigas: 10,
  iteraciones: 50,
  alpha: 1.0,
  beta: 2.0,
  rho: 0.1,
  Q: 100,
  minPheromone: 1e-6
};

export const DEFAULT_REQUEST_CONFIG = {
  requestDelay: 150,
  maxRetries: 5
};
