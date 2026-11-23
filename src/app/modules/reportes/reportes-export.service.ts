import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as XLSX from 'xlsx';
import { ReporteCampeonato, ReporteEquipo, ReporteJugador } from './reportes.model';

(pdfMake as any).vfs = pdfFonts;

@Injectable({ providedIn: 'root' })
export class ReportesExportService {
  descargarPdf(reporte: ReporteCampeonato): void {
    const resumen = reporte.resumen;
    const resumenBody = [
      ['Partidos', resumen.totalPartidos],
      ['Jugados', resumen.partidosJugados],
      ['Pendientes', resumen.partidosPendientes],
      ['Avance', `${this.numero(resumen.porcentajeAvance)}%`],
      ['Goles', resumen.totalGoles],
      ['Promedio de goles', this.numero(resumen.promedioGoles)],
      ['Equipos', resumen.totalEquipos],
      ['Jugadores habilitados', resumen.jugadoresHabilitados],
      ['Sanciones activas', resumen.sancionesActivas],
    ];
    const equipos = reporte.rendimientoEquipos.map((equipo, indice) => [
      indice + 1, equipo.equipoNombre, equipo.pj, equipo.pg, equipo.pe, equipo.pp,
      equipo.gf, equipo.gc, equipo.dg, `${this.numero(equipo.efectividad)}%`,
    ]);
    const goleadores = reporte.goleadores.map((jugador, indice) => [
      indice + 1, jugador.jugadorNombre, jugador.equipoNombre, jugador.goles, jugador.penales,
    ]);

    const documento: any = {
      pageOrientation: 'landscape',
      pageMargins: [28, 28, 28, 30],
      content: [
        { text: 'REPORTE ESTADÍSTICO DEL CAMPEONATO', style: 'title', alignment: 'center' },
        { text: reporte.contexto.ligaNombre, style: 'league', alignment: 'center' },
        {
          text: `${reporte.contexto.campeonatoNombre} · ${reporte.contexto.categoriaNombre} · ${this.etapa(reporte.contexto.etapa)}`,
          style: 'subtitle', alignment: 'center', margin: [0, 2, 0, 12],
        },
        { text: 'Resumen', style: 'section' },
        {
          columns: resumenBody.map(([label, value]) => ({
            width: '*',
            stack: [
              { text: String(value), style: 'metricValue', alignment: 'center' },
              { text: String(label), style: 'metricLabel', alignment: 'center' },
            ],
            margin: [2, 5, 2, 8],
          })),
          columnGap: 3,
        },
        { text: 'Rendimiento por equipo', style: 'section', margin: [0, 8, 0, 5] },
        {
          table: {
            headerRows: 1,
            widths: [24, '*', 28, 28, 28, 28, 28, 28, 30, 52],
            body: [[
              '#', 'EQUIPO', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'EFECT.',
            ].map((texto) => ({ text: texto, style: 'tableHeader' })), ...equipos],
          },
          layout: this.layoutTabla(),
        },
        { text: 'Máximos goleadores', style: 'section', margin: [0, 12, 0, 5] },
        goleadores.length ? {
          table: {
            headerRows: 1,
            widths: [28, '*', '*', 55, 55],
            body: [[
              '#', 'JUGADOR', 'EQUIPO', 'GOLES', 'PENALES',
            ].map((texto) => ({ text: texto, style: 'tableHeader' })), ...goleadores],
          },
          layout: this.layoutTabla(),
        } : { text: 'No existen goles registrados para los filtros seleccionados.', style: 'empty' },
        { text: `Generado el ${this.fechaActual()}`, style: 'footer', margin: [0, 12, 0, 0] },
      ],
      styles: {
        title: { fontSize: 16, bold: true, color: '#17324D' },
        league: { fontSize: 10, bold: true, color: '#2474A6' },
        subtitle: { fontSize: 9, color: '#425B70' },
        section: { fontSize: 10, bold: true, color: '#17324D' },
        metricValue: { fontSize: 12, bold: true, color: '#1E6F9F' },
        metricLabel: { fontSize: 6.5, color: '#61778A' },
        tableHeader: { bold: true, color: '#FFFFFF', fontSize: 7 },
        empty: { fontSize: 8, italics: true, color: '#6B7C8C' },
        footer: { fontSize: 7, color: '#6B7C8C' },
      },
      defaultStyle: { fontSize: 7.5, color: '#263746' },
    };
    pdfMake.createPdf(documento).download(`${this.nombreArchivo(reporte)}.pdf`);
  }

  descargarExcel(reporte: ReporteCampeonato): void {
    const resumen = reporte.resumen;
    const hojaResumen = XLSX.utils.aoa_to_sheet([
      ['REPORTE ESTADÍSTICO DEL CAMPEONATO'],
      ['Liga', reporte.contexto.ligaNombre],
      ['Campeonato', reporte.contexto.campeonatoNombre],
      ['Categoría', reporte.contexto.categoriaNombre],
      ['Etapa', this.etapa(reporte.contexto.etapa)],
      ['Generado el', this.fechaActual()],
      [],
      ['Indicador', 'Valor'],
      ['Total de partidos', resumen.totalPartidos],
      ['Partidos jugados', resumen.partidosJugados],
      ['Partidos pendientes', resumen.partidosPendientes],
      ['Avance (%)', resumen.porcentajeAvance],
      ['Total de goles', resumen.totalGoles],
      ['Promedio de goles', resumen.promedioGoles],
      ['Equipos', resumen.totalEquipos],
      ['Jugadores habilitados', resumen.jugadoresHabilitados],
      ['Sanciones activas', resumen.sancionesActivas],
      [],
      ['Estado', 'Partidos'],
      ['Jugados', reporte.estadosPartidos.jugados],
      ['Programados', reporte.estadosPartidos.programados],
      ['En juego', reporte.estadosPartidos.enJuego],
      ['Suspendidos', reporte.estadosPartidos.suspendidos],
      ['Cancelados', reporte.estadosPartidos.cancelados],
    ]);
    hojaResumen['!cols'] = [{ wch: 28 }, { wch: 32 }];
    hojaResumen['!merges'] = [XLSX.utils.decode_range('A1:B1')];

    const hojaEquipos = XLSX.utils.aoa_to_sheet([
      ['Posición', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Efectividad (%)'],
      ...reporte.rendimientoEquipos.map((equipo, indice) => [
        indice + 1, equipo.equipoNombre, equipo.pj, equipo.pg, equipo.pe, equipo.pp,
        equipo.gf, equipo.gc, equipo.dg, equipo.efectividad,
      ]),
    ]);
    hojaEquipos['!cols'] = [
      { wch: 10 }, { wch: 30 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
      { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 17 },
    ];

    const hojaGoleadores = XLSX.utils.aoa_to_sheet([
      ['Posición', 'Jugador', 'Equipo actual', 'Goles', 'Penales'],
      ...reporte.goleadores.map((jugador, indice) => [
        indice + 1, jugador.jugadorNombre, jugador.equipoNombre, jugador.goles, jugador.penales,
      ]),
    ]);
    hojaGoleadores['!cols'] = [
      { wch: 10 }, { wch: 34 }, { wch: 28 }, { wch: 10 }, { wch: 10 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');
    XLSX.utils.book_append_sheet(libro, hojaEquipos, 'Equipos');
    XLSX.utils.book_append_sheet(libro, hojaGoleadores, 'Goleadores');
    XLSX.writeFile(libro, `${this.nombreArchivo(reporte)}.xlsx`);
  }

  async descargarPdfEquipo(reporte: ReporteEquipo): Promise<void> {
    const r = reporte.rendimiento;
    const imagen = await this.cargarImagenPdf(reporte.contexto.equipoImagen);
    const identidad = imagen ? {
      columns: [
        { width: '*', text: '' },
        { width: 58, image: imagen, fit: [52, 52], alignment: 'center' },
        { width: 280, stack: [
          { text: reporte.contexto.equipoNombre, style: 'entity', alignment: 'left', margin: [0, 6, 0, 2] },
          { text: `${reporte.contexto.campeonatoNombre} · Categoria consultada: ${reporte.contexto.categoriaNombre} · Actual: ${reporte.contexto.categoriaActualNombre} · ${this.etapa(reporte.contexto.etapa)}`, alignment: 'left' },
        ] },
        { width: '*', text: '' },
      ],
      columnGap: 8,
      margin: [0, 4, 0, 12],
    } : {
      stack: [
        { text: reporte.contexto.equipoNombre, style: 'entity', alignment: 'center' },
        { text: `${reporte.contexto.campeonatoNombre} · Categoria consultada: ${reporte.contexto.categoriaNombre} · Actual: ${reporte.contexto.categoriaActualNombre} · ${this.etapa(reporte.contexto.etapa)}`, alignment: 'center' },
      ],
      margin: [0, 4, 0, 12],
    };
    const documento: any = {
      pageOrientation: 'landscape', pageMargins: [28, 28, 28, 30],
      content: [
        { text: 'REPORTE INTEGRAL DEL EQUIPO', style: 'title', alignment: 'center' },
        identidad,
        { text: `Rendimiento: PJ ${r.pj} · PG ${r.pg} · PE ${r.pe} · PP ${r.pp} · GF ${r.gf} · GC ${r.gc} · DG ${r.dg} · Efectividad ${this.numero(r.efectividad)}%`, style: 'summary' },
        { text: 'Plantilla actual', style: 'section' },
        this.tabla(['#', 'JUGADOR', 'CATEGORIA HISTORICA', 'POSICION', 'ESTADO'], reporte.plantilla.map(i => [i.dorsal, i.jugadorNombre, i.categoriaHistoricaNombre, i.posicion, i.estado]), [28, '*', 95, 70, 60]),
        { text: 'Movimientos de categoria', style: 'section' },
        this.tabla(['FECHA', 'MOVIMIENTO', 'ORIGEN', 'DESTINO'], reporte.movimientosCategoria.map(i => [this.formatearFecha(i.fecha), i.motivo, i.categoriaOrigenNombre, i.categoriaDestinoNombre]), [65, 65, '*', '*']),
        { text: 'Partidos', style: 'section' },
        this.tabla(['JORNADA', 'RIVAL', 'CONDICION', 'MARCADOR', 'ESTADO'], reporte.partidos.map(i => [`${this.etapa(i.etapa)} J${i.jornada}`, i.rivalNombre, i.condicion, i.gf === null ? '-' : `${i.gf}-${i.gc}`, i.resultado === 'pendiente' ? i.estado : i.resultado]), [90, '*', 65, 55, 65]),
        { text: 'Goleadores', style: 'section' },
        this.tabla(['JUGADOR', 'GOLES', 'PENALES'], reporte.goleadores.map(i => [i.jugadorNombre, i.goles, i.penales]), ['*', 55, 55]),
        { text: `Generado el ${this.fechaActual()}`, style: 'footer' },
      ],
      styles: this.estilosDocumento(), defaultStyle: { fontSize: 7.5, color: '#263746' },
    };
    pdfMake.createPdf(documento).download(this.archivoEntidad('EQUIPO', reporte.contexto.equipoNombre, reporte.contexto.campeonatoNombre, 'pdf'));
  }

  descargarExcelEquipo(reporte: ReporteEquipo): void {
    const libro = XLSX.utils.book_new();
    const r = reporte.rendimiento;
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([
      ['REPORTE INTEGRAL DEL EQUIPO'], ['Equipo', reporte.contexto.equipoNombre], ['Campeonato', reporte.contexto.campeonatoNombre], ['Categoria', reporte.contexto.categoriaNombre], ['Etapa', this.etapa(reporte.contexto.etapa)], [],
      ['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Efectividad (%)'], [r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.dg, r.efectividad],
    ]), 'Resumen');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Dorsal', 'Jugador', 'Categoria historica', 'Categoria actual', 'Posicion', 'Estado', 'Tipo'], ...reporte.plantilla.map(i => [i.dorsal, i.jugadorNombre, i.categoriaHistoricaNombre, i.categoriaActualNombre, i.posicion, i.estado, i.tipoSolicitud])]), 'Plantilla');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Etapa', 'Jornada', 'Fecha', 'Rival', 'Condicion', 'GF', 'GC', 'Estado'], ...reporte.partidos.map(i => [i.etapa, i.jornada, i.fecha, i.rivalNombre, i.condicion, i.gf, i.gc, i.resultado === 'pendiente' ? i.estado : i.resultado])]), 'Partidos');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Jugador', 'Goles', 'Penales'], ...reporte.goleadores.map(i => [i.jugadorNombre, i.goles, i.penales])]), 'Goleadores');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Tipo', 'Jugador', 'Descripcion', 'Fecha', 'Activa'], ...reporte.sanciones.map(i => [i.tipoNombre, i.jugadorNombre, i.descripcion, i.fecha, i.activa ? 'Si' : 'No'])]), 'Sanciones');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Jugador', 'Origen', 'Destino', 'Fecha', 'Estado'], ...reporte.transferencias.map(i => [i.jugadorNombre, i.equipoOrigen, i.equipoDestino, i.fecha, i.estadoDirectivo])]), 'Transferencias');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Fecha', 'Movimiento', 'Categoria origen', 'Categoria destino'], ...reporte.movimientosCategoria.map(i => [i.fecha, i.motivo, i.categoriaOrigenNombre, i.categoriaDestinoNombre])]), 'Categorias');
    XLSX.writeFile(libro, this.archivoEntidad('EQUIPO', reporte.contexto.equipoNombre, reporte.contexto.campeonatoNombre, 'xlsx'));
  }

  async descargarPdfJugador(reporte: ReporteJugador): Promise<void> {
    const imagen = await this.cargarImagenPdf(reporte.contexto.jugadorImagen);
    const identidad = imagen ? {
      columns: [
        { width: '*', text: '' },
        { width: 66, image: imagen, fit: [58, 68], alignment: 'center' },
        { width: 280, stack: [
          { text: reporte.contexto.jugadorNombre, style: 'entity', alignment: 'left', margin: [0, 8, 0, 2] },
          { text: `Equipo del periodo: ${reporte.contexto.equipoConsultado || '-'} · Equipo actual: ${reporte.contexto.equipoActual} · Dorsal actual ${reporte.contexto.dorsalActual ?? '-'} · ${reporte.contexto.campeonatoNombre}`, alignment: 'left' },
        ] },
        { width: '*', text: '' },
      ],
      columnGap: 8,
      margin: [0, 4, 0, 12],
    } : {
      stack: [
        { text: reporte.contexto.jugadorNombre, style: 'entity', alignment: 'center' },
        { text: `Equipo del periodo: ${reporte.contexto.equipoConsultado || '-'} · Equipo actual: ${reporte.contexto.equipoActual} · Dorsal actual ${reporte.contexto.dorsalActual ?? '-'} · ${reporte.contexto.campeonatoNombre}`, alignment: 'center' },
      ],
      margin: [0, 4, 0, 12],
    };
    const documento: any = {
      pageMargins: [30, 28, 30, 30],
      content: [
        { text: 'HISTORIAL DEL JUGADOR', style: 'title', alignment: 'center' },
        identidad,
        { text: `Goles ${reporte.resumen.goles} · Sanciones activas ${reporte.resumen.sancionesActivas} · Habilitaciones ${reporte.resumen.habilitaciones} · Transferencias ${reporte.resumen.transferencias}`, style: 'summary' },
        { text: 'Participacion y disciplina', style: 'section' },
        { text: `Partidos del equipo ${reporte.participacion.resumen.partidosEquipo} · Jugo ${reporte.participacion.resumen.partidosJugados} · No jugo ${reporte.participacion.resumen.partidosNoJugados} · Participacion ${this.numero(reporte.participacion.resumen.porcentajeParticipacion)}% · Amarillas ${reporte.participacion.resumen.amarillas} · Rojas ${reporte.participacion.resumen.rojas} · Expulsiones ${reporte.participacion.resumen.expulsiones}`, style: 'summary' },
        { text: `No convocado ${reporte.participacion.resumen.noConvocado} · Ausente ${reporte.participacion.resumen.ausencias} · Suspendido ${reporte.participacion.resumen.suspendido} · Lesionado ${reporte.participacion.resumen.lesionado} · Dobles amarillas ${reporte.participacion.resumen.doblesAmarillas} · Sin planilla ${reporte.participacion.resumen.sinRegistro}`, style: 'summary' },
        this.tabla(['FECHA', 'ETAPA/J.', 'RIVAL', 'PARTICIPACION', 'GOLES', 'TA', 'TR', 'EXP.'], reporte.participacion.detalle.map(i => [this.formatearFecha(i.fecha), `${this.etapa(i.etapa)} J${i.jornada}`, i.rivalNombre, this.estadoParticipacion(i.estado), i.goles, i.amarillas, i.rojas, i.expulsado ? 'Si' : 'No']), [55, 75, '*', 75, 35, 28, 28, 32]),
        { text: 'Linea de tiempo', style: 'section' },
        ...reporte.lineaTiempo.map(item => ({ stack: [{ text: `${this.formatearFecha(item.fecha)} · ${item.titulo}`, bold: true }, { text: item.detalle, color: '#5f7382' }], margin: [0, 0, 0, 7] })),
        { text: 'Habilitaciones', style: 'section' },
        this.tabla(['EQUIPO', 'CATEGORIA', '#', 'ESTADO', 'TIPO'], reporte.habilitaciones.map(i => [i.equipoNombre, i.categoriaNombre, i.dorsal, i.estado, i.tipoSolicitud]), ['*', 80, 28, 55, 55]),
        { text: 'Sanciones', style: 'section' },
        this.tabla(['TIPO', 'DESCRIPCION', 'FECHA', 'ESTADO'], reporte.sanciones.map(i => [i.tipoNombre, i.descripcion || '-', this.formatearFecha(i.fecha), i.activa ? 'Activa' : 'Historica']), [90, '*', 60, 55]),
        { text: `Generado el ${this.fechaActual()}`, style: 'footer' },
      ],
      styles: this.estilosDocumento(), defaultStyle: { fontSize: 8, color: '#263746' },
    };
    pdfMake.createPdf(documento).download(this.archivoEntidad('JUGADOR', reporte.contexto.jugadorNombre, reporte.contexto.campeonatoNombre, 'pdf'));
  }

  descargarExcelJugador(reporte: ReporteJugador): void {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([
      ['HISTORIAL DEL JUGADOR'], ['Jugador', reporte.contexto.jugadorNombre], ['Cedula', reporte.contexto.cedula], ['Equipo del periodo', reporte.contexto.equipoConsultado], ['Equipo actual', reporte.contexto.equipoActual], ['Dorsal actual', reporte.contexto.dorsalActual], ['Campeonato', reporte.contexto.campeonatoNombre], [],
      ['Goles', 'Penales', 'Autogoles', 'Sanciones activas', 'Habilitaciones', 'Transferencias', 'Cambios dorsal'], [reporte.resumen.goles, reporte.resumen.penales, reporte.resumen.autogoles, reporte.resumen.sancionesActivas, reporte.resumen.habilitaciones, reporte.resumen.transferencias, reporte.resumen.cambiosDorsal],
    ]), 'Resumen');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Fecha', 'Tipo', 'Evento', 'Detalle'], ...reporte.lineaTiempo.map(i => [i.fecha, i.tipo, i.titulo, i.detalle])]), 'Linea de tiempo');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Equipo', 'Categoria', 'Dorsal', 'Posicion', 'Estado', 'Tipo', 'Solicitud', 'Baja'], ...reporte.habilitaciones.map(i => [i.equipoNombre, i.categoriaNombre, i.dorsal, i.posicion, i.estado, i.tipoSolicitud, i.fechaSolicitud, i.fechaBaja])]), 'Habilitaciones');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Fecha', 'Etapa', 'Jornada', 'Tipo', 'Equipo'], ...reporte.goles.map(i => [i.fecha, i.etapa, i.jornada, i.tipo, i.equipoNombre])]), 'Goles');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([
      ['PARTICIPACION Y DISCIPLINA'],
      ['Partidos del equipo', reporte.participacion.resumen.partidosEquipo],
      ['Partidos con planilla', reporte.participacion.resumen.partidosConRegistro],
      ['Jugo', reporte.participacion.resumen.partidosJugados],
      ['No jugo', reporte.participacion.resumen.partidosNoJugados],
      ['Sin planilla', reporte.participacion.resumen.sinRegistro],
      ['No convocado', reporte.participacion.resumen.noConvocado],
      ['Ausente', reporte.participacion.resumen.ausencias],
      ['Suspendido', reporte.participacion.resumen.suspendido],
      ['Lesionado', reporte.participacion.resumen.lesionado],
      ['Participacion (%)', reporte.participacion.resumen.porcentajeParticipacion],
      ['Amarillas', reporte.participacion.resumen.amarillas],
      ['Dobles amarillas', reporte.participacion.resumen.doblesAmarillas],
      ['Rojas', reporte.participacion.resumen.rojas],
      ['Expulsiones', reporte.participacion.resumen.expulsiones],
      [],
      ['Fecha', 'Etapa', 'Jornada', 'Rival', 'Participacion', 'Dorsal', 'Goles', 'Amarillas', 'Dobles amarillas', 'Rojas', 'Expulsion', 'Observaciones'],
      ...reporte.participacion.detalle.map(i => [i.fecha, i.etapa, i.jornada, i.rivalNombre, this.estadoParticipacion(i.estado), i.dorsal, i.goles, i.amarillas, i.doblesAmarillas, i.rojas, i.expulsado ? 'Si' : 'No', i.observaciones]),
    ]), 'Participacion');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Tipo', 'Descripcion', 'Fecha', 'Activa', 'Cumplidos', 'Suspension'], ...reporte.sanciones.map(i => [i.tipoNombre, i.descripcion, i.fecha, i.activa ? 'Si' : 'No', i.partidosCumplidos, i.partidosSuspension])]), 'Sanciones');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Origen', 'Destino', 'Fecha', 'Estado origen', 'Estado directivo'], ...reporte.transferencias.map(i => [i.equipoOrigen, i.equipoDestino, i.fecha, i.estadoOrigen, i.estadoDirectivo])]), 'Transferencias');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Etapa', 'Anterior', 'Nuevo', 'Jornada desde', 'Motivo', 'Activo'], ...reporte.cambiosDorsal.map(i => [i.etapa, i.dorsalAnterior, i.dorsalNuevo, i.jornadaDesde, i.motivo, i.activo ? 'Si' : 'No'])]), 'Dorsales');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Fecha', 'Equipo', 'Movimiento', 'Categoria origen', 'Categoria destino'], ...reporte.movimientosCategoria.map(i => [i.fecha, i.equipoNombre, i.motivo, i.categoriaOrigenNombre, i.categoriaDestinoNombre])]), 'Categorias');
    XLSX.writeFile(libro, this.archivoEntidad('JUGADOR', reporte.contexto.jugadorNombre, reporte.contexto.campeonatoNombre, 'xlsx'));
  }

  private tabla(encabezados: string[], filas: any[][], anchos: any[]): any {
    return filas.length ? { table: { headerRows: 1, widths: anchos, body: [encabezados.map(text => ({ text, style: 'tableHeader' })), ...filas] }, layout: this.layoutTabla(), margin: [0, 0, 0, 10] } : { text: 'Sin registros para los filtros seleccionados.', italics: true, color: '#6B7C8C', margin: [0, 0, 0, 10] };
  }

  private async cargarImagenPdf(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const respuesta = await fetch(url, { signal: controller.signal });
      if (!respuesta.ok) return null;
      const blob = await respuesta.blob();
      return await new Promise<string | null>((resolve) => {
        const lector = new FileReader();
        lector.onload = () => resolve(typeof lector.result === 'string' ? lector.result : null);
        lector.onerror = () => resolve(null);
        lector.readAsDataURL(blob);
      });
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private estadoParticipacion(estado: string): string {
    const etiquetas: Record<string, string> = {
      jugo: 'Jugo',
      no_jugo: 'No jugo',
      suspendido: 'Suspendido',
      ausente: 'Ausente',
      lesionado: 'Lesionado',
      expulsado: 'Jugo y fue expulsado',
      sin_registro: 'Sin planilla',
    };
    return etiquetas[estado] ?? estado;
  }

  private estilosDocumento(): any {
    return { title: { fontSize: 16, bold: true, color: '#17324D' }, entity: { fontSize: 12, bold: true, color: '#2474A6' }, summary: { fontSize: 9, bold: true, color: '#284d68', fillColor: '#eef5f9', margin: [0, 5, 0, 12] }, section: { fontSize: 10, bold: true, color: '#17324D', margin: [0, 9, 0, 5] }, tableHeader: { bold: true, color: '#FFFFFF', fontSize: 7 }, footer: { fontSize: 7, color: '#6B7C8C', margin: [0, 10, 0, 0] } };
  }

  private formatearFecha(valor: string): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
  }

  private archivoEntidad(tipo: string, nombre: string, campeonato: string, extension: string): string {
    return `${tipo}_${nombre}_${campeonato}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase() + `.${extension}`;
  }

  private layoutTabla(): any {
    return {
      fillColor: (fila: number) => fila === 0 ? '#1A3A5A' : fila % 2 === 0 ? '#F4F7FA' : null,
      hLineColor: () => '#D8E1EA',
      vLineColor: () => '#D8E1EA',
    };
  }

  private etapa(etapa: string | null): string {
    return etapa ? etapa.replace(/_/g, ' ').replace(/\b\w/g, letra => letra.toUpperCase()) : 'Todas las etapas';
  }

  private numero(valor: number): string {
    return new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(valor);
  }

  private fechaActual(): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());
  }

  private nombreArchivo(reporte: ReporteCampeonato): string {
    return `REPORTE_${reporte.contexto.campeonatoNombre}_${reporte.contexto.categoriaNombre}_${this.etapa(reporte.contexto.etapa)}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase();
  }
}
