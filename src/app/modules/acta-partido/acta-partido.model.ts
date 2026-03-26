export type EstadoAlineacion =
  | 'jugo'
  | 'no_jugo'
  | 'suspendido'
  | 'ausente'
  | 'lesionado'
  | 'expulsado';

export type TipoIncidencia =
  | 'tarjeta_amarilla'
  | 'tarjeta_roja'
  | 'doble_amarilla'
  | 'expulsion_directa'
  | 'incidencia_grave'
  | 'otro';

export type EstadoResolucion = 'pendiente' | 'sancionado' | 'absuelto';
export type EstadoInforme    = 'borrador'  | 'enviado_tribunal' | 'resuelto';

/** Un registro de la planilla ya guardada */
export interface ActaAlineacion {
  id: number;
  partidoId: number;
  campeonatoId: number;
  equipoId: number;
  equipo?: any;
  jugadorId: number;
  jugador?: any;
  estado: EstadoAlineacion;
  numeroCancha?: number;
  observaciones?: string;
  activo: boolean;
  creadoEn: string;
}

/** Un jugador disponible para pre-cargar en la planilla */
export interface JugadorDisponible {
  jugadorId: number;
  jugador: any;
  equipoId: number;
  equipo: any;
  numeroCancha?: number;
  /** Estado que el sistema sugiere automáticamente (ej: 'suspendido' si tiene sanción activa) */
  estadoSugerido: EstadoAlineacion;
  sancionActiva: any | null;
}

/** Respuesta del endpoint GET jugadores-disponibles */
export interface JugadoresDisponiblesResponse {
  partido: any;
  jugadoresLocal: JugadorDisponible[];
  jugadoresVisitante: JugadorDisponible[];
}

/** Respuesta del endpoint GET o PUT alineacion */
export interface AlineacionResponse {
  partido: any;
  jugadoresLocal: ActaAlineacion[];
  jugadoresVisitante: ActaAlineacion[];
}

/** Fila editable en el formulario (combina datos del jugador + el estado que el usuario elige) */
export interface FilaAlineacion {
  jugadorId: number;
  equipoId: number;
  nombreCompleto: string;
  numeroCancha: number | null;
  estadoSugerido: EstadoAlineacion;
  estadoSeleccionado: EstadoAlineacion;
  observaciones: string;
  sancionActiva: any | null;
}

/** DTO para enviar al backend */
export interface GuardarAlineacionDto {
  jugadores: {
    jugadorId: number;
    equipoId: number;
    estado: EstadoAlineacion;
    numeroCancha?: number;
    observaciones?: string;
  }[];
}

// ─── INFORME DEL VOCAL ────────────────────────────────────────────────────────

/** Una incidencia disciplinaria registrada por el vocal durante el partido */
export interface ActaIncidencia {
  id?: number;
  partidoId: number;
  campeonatoId: number;
  categoriaId?: number | null;
  equipoId: number;
  equipo?: any;
  jugadorId?: number | null;
  jugador?: any | null;
  tipoIncidencia: TipoIncidencia;
  minuto?: number | null;
  descripcion?: string | null;
  estadoResolucion: EstadoResolucion;
  sancionId?: number | null;
  observacionesTribunal?: string | null;
  fechaResolucion?: string | null;
  activo: boolean;
  creadoEn?: string;
}

/** Informe general del partido (uno por partido) */
export interface ActaInformePartido {
  id?: number;
  partidoId: number;
  campeonatoId: number;
  observacionesVocal?: string | null;
  nombreArbitro?: string | null;
  observacionesArbitro?: string | null;
  /** Nombre del vocal (texto libre: equipo, jugador o directivo) */
  vocalNombre?: string | null;
  /** ID del equipo al que pertenece el vocal */
  vocalEquipoId?: number | null;
  vocalEquipo?: any | null;
  estado: EstadoInforme;
  activo: boolean;
  creadoEn?: string;
}

export interface InformePartidoResponse {
  partido: any;
  informe: ActaInformePartido | null;
  incidencias: ActaIncidencia[];
}

/** Fila editable de incidencia en el formulario del vocal */
export interface FilaIncidencia {
  equipoId: number;
  jugadorId: number | null;
  tipoIncidencia: TipoIncidencia;
  minuto: number | null;
  descripcion: string;
}

export interface GuardarInformePartidoDto {
  observacionesVocal?: string;
  nombreArbitro?: string;
  observacionesArbitro?: string;
  vocalNombre?: string;
  vocalEquipoId?: number | null;
  enviarATribunal?: boolean;
  incidencias: FilaIncidencia[];
}

export interface ResolverIncidenciaDto {
  decision: 'sancionar' | 'absolver';
  tipoSancionId?: number;
  reglaSancionId?: number;
  partidosSuspension?: number;
  descripcion?: string;
  observacionesTribunal?: string;
  fechaSancion?: string;
}

// ─── LABELS ───────────────────────────────────────────────────────────────────

export const TIPO_INCIDENCIA_LABELS: Record<TipoIncidencia, string> = {
  tarjeta_amarilla:  '🟡 Tarjeta Amarilla',
  tarjeta_roja:      '🔴 Tarjeta Roja',
  doble_amarilla:    '🟡🟡 Doble Amarilla',
  expulsion_directa: '🔴 Expulsión Directa',
  incidencia_grave:  '⚠️ Incidencia Grave',
  otro:              'Otro',
};

export const TIPO_INCIDENCIA_COLOR: Record<TipoIncidencia, string> = {
  tarjeta_amarilla:  '#f39c12',
  tarjeta_roja:      '#e74c3c',
  doble_amarilla:    '#e67e22',
  expulsion_directa: '#c0392b',
  incidencia_grave:  '#8e44ad',
  otro:              '#7f8c8d',
};

/** Etiquetas legibles para mostrar en la UI */
export const ESTADO_ALINEACION_LABELS: Record<EstadoAlineacion, string> = {
  jugo:       'Jugó',
  no_jugo:    'No jugó',
  suspendido: 'Suspendido',
  ausente:    'Ausente',
  lesionado:  'Lesionado',
  expulsado:  'Expulsado',
};

/** Colores para cada estado (clase CSS o estilo directo) */
export const ESTADO_ALINEACION_COLORS: Record<EstadoAlineacion, string> = {
  jugo:       '#27ae60',
  no_jugo:    '#7f8c8d',
  suspendido: '#e74c3c',
  ausente:    '#f39c12',
  lesionado:  '#e67e22',
  expulsado:  '#8e44ad',
};
