/**
 * Representa una fila en la tabla de posiciones.
 * Devuelta por el backend en GET /tabla-posiciones
 */
export interface FilaPosicion {
  posicion: number;
  equipoId: number;
  equipoNombre: string;
  pj: number;     // Partidos Jugados
  pg: number;     // Partidos Ganados
  pe: number;     // Partidos Empatados
  pp: number;     // Partidos Perdidos
  gf: number;     // Goles a Favor
  gc: number;     // Goles en Contra
  dg: number;     // Diferencia de Goles
  puntos: number; // Puntos totales
  tieneSancion: boolean; // true si el equipo fue sancionado al menos 1 vez en la etapa
}
