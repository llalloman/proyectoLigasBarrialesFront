export interface TipoSancion {
  id: number;
  nombre: string;
  descripcion?: string;
  aplicaA: 'jugador' | 'equipo' | 'directivo' | 'barra';
  ligaId?: number;
  activo: boolean;
  creadoEn?: string;
}

export interface ReglaSancion {
  id: number;
  ligaId: number;
  campeonatoId?: number;
  tipoSancionId: number;
  tipoSancion?: TipoSancion;
  descripcion?: string;
  acumulacionActiva: boolean;
  acumulacionCantidad?: number;
  partidosSuspension?: number;
  puntosDescuento?: number;
  activo: boolean;
  creadoEn?: string;
}

export interface Sancion {
  id: number;
  tipoSancionId: number;
  tipoSancion?: TipoSancion;
  reglaSancionId?: number;
  reglaSancion?: ReglaSancion;
  ligaId: number;
  campeonatoId: number;
  campeonato?: { id: number; nombre: string };
  categoriaId?: number;
  categoria?: { id: number; nombre: string };
  partidoId?: number;
  partido?: { id: number; jornada: number; etapa: string };
  jugadorId?: number;
  jugador?: { id: number; nombre: string };
  equipoId?: number;
  equipo?: { id: number; nombre: string };
  descripcion?: string;
  partidosSuspension: number;
  partidosCumplidos: number;
  suspensionActiva: boolean;
  fechaSancion?: string;
  activo: boolean;
  creadoEn?: string;
}

export interface CreateTipoSancionDto {
  nombre: string;
  descripcion?: string;
  aplicaA?: string;
  ligaId?: number;
}

export interface CreateReglaSancionDto {
  ligaId: number;
  campeonatoId?: number;
  tipoSancionId: number;
  descripcion?: string;
  acumulacionActiva?: boolean;
  acumulacionCantidad?: number;
  partidosSuspension?: number;
  puntosDescuento?: number;
}

export interface UpdateReglaSancionDto {
  descripcion?: string;
  acumulacionActiva?: boolean;
  acumulacionCantidad?: number;
  partidosSuspension?: number;
  puntosDescuento?: number;
  activo?: boolean;
}

export interface CreateSancionDto {
  tipoSancionId: number;
  ligaId: number;
  campeonatoId: number;
  categoriaId?: number;
  partidoId?: number;
  jugadorId?: number;
  equipoId?: number;
  reglaSancionId?: number;
  descripcion?: string;
  partidosSuspension?: number;
  suspensionActiva?: boolean;
  fechaSancion?: string;
}

export interface FiltrosSanciones {
  campeonatoId?: number;
  ligaId?: number;
  jugadorId?: number;
  equipoId?: number;
  tipoSancionId?: number;
  soloActivas?: boolean;
}
