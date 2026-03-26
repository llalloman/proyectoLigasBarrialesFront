/**
 * Representa una fila en la tabla de goleadores.
 * Devuelta por el backend en GET /goles/goleadores
 */
export interface FilaGoleador {
  posicion: number;
  jugadorId: number;
  jugadorNombre: string;
  equipoId: number;
  equipoNombre: string;
  total: number;     // Total de goles (normal + penal). Autogoles NO cuentan aquí.
  penales: number;   // Cuántos del total fueron tiro penal
  autogoles: number; // Goles en contra (informativo)
}
