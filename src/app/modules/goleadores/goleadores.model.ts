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
  total: number;        // Total de goles (normal + penal). Autogoles NO cuentan aquí.
  penales: number;      // Cuántos del total fueron tiro penal
  autogoles: number;    // Goles en contra (informativo)
  numeroCancha: number | null; // Número de camiseta de la habilitación
}

export type TipoGol = 'normal' | 'penal' | 'autogol';
export type EstadoHistorialGol = 'activos' | 'inactivos' | 'todos';

export interface HistorialGolFiltros {
  campeonatoId: number;
  categoriaId?: number | null;
  etapa?: string;
  jornada?: number | null;
  equipoId?: number | null;
  jugadorId?: number | null;
  tipo?: TipoGol | '';
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoHistorialGol;
  pagina?: number;
  limite?: number;
}

export interface HistorialGolItem {
  id: number;
  partidoId: number;
  campeonatoId: number;
  campeonatoNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  etapa: string;
  jornada: number;
  fechaPartido: string | null;
  horaPartido: string | null;
  jugadorId: number;
  jugadorNombre: string;
  equipoJugadorId: number;
  equipoJugadorNombre: string;
  equipoBeneficiadoId: number;
  equipoBeneficiadoNombre: string;
  rivalId: number;
  rivalNombre: string;
  localNombre: string;
  visitanteNombre: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  minuto: number | null;
  tipo: TipoGol;
  activo: boolean;
}

export interface HistorialGolesRespuesta {
  items: HistorialGolItem[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  resumen: {
    registros: number;
    golesJugador: number;
    penales: number;
    autogoles: number;
  };
  opciones: {
    etapas: string[];
    jornadas: number[];
    jornadasPorEtapa: Record<string, number[]>;
    equipos: Array<{ id: number; nombre: string }>;
    jugadores: Array<{ id: number; nombre: string; equipoIds: number[] }>;
  };
}
