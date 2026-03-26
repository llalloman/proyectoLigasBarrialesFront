export interface Partido {
  id: number;
  campeonatoId: number;
  campeonato?: any;
  categoriaId: number;
  categoria?: any;
  equipoLocalId: number | null;
  equipoLocalOrden?: number | null;
  equipoLocal?: any;
  equipoVisitanteId: number | null;
  equipoVisitanteOrden?: number | null;
  equipoVisitante?: any;
  etapa: string;
  jornada: number;
  fechaPartido?: string;
  horaPartido?: string;
  cancha?: string;
  estado: 'programado' | 'jugado' | 'suspendido' | 'cancelado';
  golesLocal?: number;
  golesVisitante?: number;
  bonificacionLocal?: number;
  bonificacionVisitante?: number;
  sancionado?: 'ninguno' | 'local' | 'visitante';
  observaciones?: string;
  activo: boolean;
  creadoEn: string;
}

export interface CreatePartidoDto {
  campeonatoId: number;
  categoriaId: number;
  equipoLocalId: number;
  equipoVisitanteId: number;
  etapa: string;
  jornada: number;
  fechaPartido?: string;
  horaPartido?: string;
  cancha?: string;
  observaciones?: string;
}

export interface UpdatePartidoDto extends Partial<CreatePartidoDto> {
  estado?: 'programado' | 'jugado' | 'suspendido' | 'cancelado';
}

export interface AutorGolDto {
  jugadorId: number;
  equipoDelJugadorId: number;
  minuto?: number;
  tipo?: 'normal' | 'penal' | 'autogol';
}

export interface RegistrarResultadoDto {
  golesLocal: number;
  golesVisitante: number;
  bonificacionLocal?: number;
  bonificacionVisitante?: number;
  observaciones?: string;
  sancionado?: 'ninguno' | 'local' | 'visitante';
  /** Lista de autores de goles. Opcional: si no se envía, el marcador se guarda sin detalle. */
  autoresGoles?: AutorGolDto[];
}

export interface GenerarFixtureDto {
  campeonatoId: number;
  categoriaId: number;
  equipoIds: number[];
  etapa: string;
  conRevancha?: boolean;
}

export interface GenerarFixtureResponse {
  totalPartidos: number;
  totalJornadas: number;
  partidos: Partido[];
}
