export interface ReporteRendimientoEquipo {
  equipoId: number;
  equipoNombre: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  efectividad: number;
}

export interface ReporteGoleador {
  jugadorId: number;
  jugadorNombre: string;
  equipoId: number | null;
  equipoNombre: string;
  goles: number;
  penales: number;
}

export interface ReporteCampeonato {
  contexto: {
    ligaId: number;
    ligaNombre: string;
    campeonatoId: number;
    campeonatoNombre: string;
    categoriaId: number | null;
    categoriaNombre: string;
    etapa: string | null;
  };
  opciones: { etapas: string[] };
  resumen: {
    totalPartidos: number;
    partidosJugados: number;
    partidosPendientes: number;
    porcentajeAvance: number;
    totalGoles: number;
    promedioGoles: number;
    totalEquipos: number;
    jugadoresHabilitados: number;
    sancionesActivas: number;
  };
  estadosPartidos: {
    jugados: number;
    programados: number;
    enJuego: number;
    suspendidos: number;
    cancelados: number;
  };
  rendimientoEquipos: ReporteRendimientoEquipo[];
  goleadores: ReporteGoleador[];
}

export interface ReporteCampeonatoFiltros {
  campeonatoId: number;
  categoriaId?: number | null;
  etapa?: string;
}

export interface ReporteSancionDetalle {
  id: number;
  tipoNombre: string;
  aplicaA: string;
  jugadorId: number | null;
  jugadorNombre: string;
  descripcion: string;
  partidosSuspension: number;
  partidosCumplidos: number;
  fecha: string;
  fechaFin: string | null;
  activa: boolean;
}

export interface ReporteEquipo {
  contexto: {
    ligaId: number;
    ligaNombre: string;
    campeonatoId: number;
    campeonatoNombre: string;
    categoriaId: number | null;
    categoriaNombre: string;
    categoriaActualNombre: string;
    etapa: string | null;
    equipoId: number;
    equipoNombre: string;
    equipoImagen: string | null;
    representante: string;
  };
  opciones: { etapas: string[] };
  resumen: {
    habilitados: number;
    pendientes: number;
    bajas: number;
    partidosJugados: number;
    partidosPendientes: number;
    golesFavor: number;
    golesContra: number;
    sancionesActivas: number;
    transferencias: number;
  };
  rendimiento: { pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dg: number; efectividad: number };
  plantilla: Array<{
    habilitacionId: number;
    jugadorId: number;
    jugadorNombre: string;
    cedula: string;
    dorsal: number;
    posicion: string;
    estado: string;
    tipoSolicitud: string;
    fecha: string;
    categoriaActualNombre: string;
    categoriaHistoricaNombre: string;
  }>;
  partidos: Array<{
    id: number; jornada: number; etapa: string; fecha: string | null; hora: string | null;
    condicion: string; rivalId: number | null; rivalNombre: string; estado: string;
    gf: number | null; gc: number | null; resultado: string;
  }>;
  goleadores: Array<{ jugadorId: number; jugadorNombre: string; goles: number; penales: number }>;
  sanciones: ReporteSancionDetalle[];
  movimientosCategoria: ReporteMovimientoCategoria[];
  transferencias: Array<{
    id: number; jugadorId: number; jugadorNombre: string; equipoOrigen: string; equipoDestino: string;
    fecha: string; estadoOrigen: string; estadoDirectivo: string;
  }>;
}

export interface ReporteJugador {
  contexto: {
    ligaId: number; ligaNombre: string; campeonatoId: number; campeonatoNombre: string;
    categoriaId: number | null; categoriaNombre: string; etapa: string | null;
    jugadorId: number; jugadorNombre: string; jugadorImagen: string | null; cedula: string; equipoActual: string;
    equipoConsultado: string;
    dorsalActual: number | null; posicion: string;
  };
  opciones: { etapas: string[] };
  resumen: {
    goles: number; penales: number; autogoles: number; sancionesActivas: number;
    habilitaciones: number; transferencias: number; cambiosDorsal: number;
  };
  habilitaciones: Array<{
    id: number;
    equipoId: number;
    equipoNombre: string;
    categoriaId: number;
    categoriaNombre: string;
    dorsal: number;
    posicion: string;
    estado: string;
    tipoSolicitud: string;
    categoriaActualNombre: string;
    fechaSolicitud: string;
    fechaAprobacion: string | null;
    fechaBaja: string | null;
    motivoBaja: string | null;
  }>;
  transferencias: Array<{
    id: number; equipoOrigen: string; equipoDestino: string; fecha: string;
    estadoOrigen: string; estadoDirectivo: string;
  }>;
  cambiosDorsal: Array<{
    id: number; etapa: string; dorsalAnterior: number | null; dorsalNuevo: number;
    jornadaDesde: number; motivo: string; activo: boolean; fecha: string; fechaAnulacion: string | null;
  }>;
  goles: Array<{
    id: number; partidoId: number; fecha: string; jornada: number | null; etapa: string;
    equipoNombre: string; tipo: string; minuto: number | null;
  }>;
  participacion: {
    resumen: {
      partidosEquipo: number;
      partidosConRegistro: number;
      partidosJugados: number;
      partidosNoJugados: number;
      sinRegistro: number;
      noConvocado: number;
      ausencias: number;
      suspendido: number;
      lesionado: number;
      expulsiones: number;
      amarillas: number;
      doblesAmarillas: number;
      rojas: number;
      porcentajeParticipacion: number;
    };
    detalle: Array<{
      partidoId: number;
      fecha: string;
      etapa: string;
      jornada: number;
      equipoId: number;
      rivalId: number | null;
      rivalNombre: string;
      estado: 'jugo' | 'no_jugo' | 'suspendido' | 'ausente' | 'lesionado' | 'expulsado' | 'sin_registro';
      dorsal: number | null;
      goles: number;
      amarillas: number;
      doblesAmarillas: number;
      rojas: number;
      expulsado: boolean;
      observaciones: string;
    }>;
  };
  sanciones: ReporteSancionDetalle[];
  movimientosCategoria: ReporteMovimientoCategoria[];
  lineaTiempo: Array<{ id: string; fecha: string; tipo: string; titulo: string; detalle: string }>;
}

export interface ReporteMovimientoCategoria {
  inscripcionOrigenId: number;
  inscripcionDestinoId: number;
  equipoId: number;
  equipoNombre: string;
  categoriaOrigenId: number;
  categoriaOrigenNombre: string;
  categoriaDestinoId: number;
  categoriaDestinoNombre: string;
  motivo: 'ascenso' | 'descenso';
  fecha: string;
}

export interface ReporteEntidadFiltros {
  campeonatoId: number;
  categoriaId?: number | null;
  etapa?: string;
  equipoId?: number;
  jugadorId?: number;
}

export interface ReporteJugadorOpcion {
  jugadorId: number;
  jugadorNombre: string;
  cedula: string;
  equipoPeriodoId: number;
  equipoPeriodoNombre: string;
  equipoActualId: number | null;
  equipoActualNombre: string;
  estadoEnPeriodo: string;
}

export interface ReporteJugadoresOpciones {
  etapas: string[];
  jugadores: ReporteJugadorOpcion[];
}
