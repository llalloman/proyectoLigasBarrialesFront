import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as XLSX from 'xlsx';
import { HistorialGolItem } from './goleadores.model';

(pdfMake as any).vfs = pdfFonts;

export interface HistorialGolesExportables {
  ligaNombre: string;
  campeonatoNombre: string;
  categoriaNombre: string;
  filtrosDescripcion: string;
  registros: HistorialGolItem[];
}

@Injectable({ providedIn: 'root' })
export class GoleadoresHistorialExportService {
  descargarPdf(data: HistorialGolesExportables): void {
    const encabezado = [
      'FECHA', 'ETAPA / J.', 'PARTIDO', 'JUGADOR', 'EQUIPO', 'RIVAL', 'MIN.', 'TIPO', 'MARCADOR',
    ].map((text) => ({ text, style: 'tableHeader', alignment: 'center' }));

    const filas = data.registros.map((gol) => [
      this.fechaPartido(gol.fechaPartido),
      `${this.etapa(gol.etapa)} / J${gol.jornada}`,
      `${gol.localNombre} vs ${gol.visitanteNombre}`,
      gol.jugadorNombre,
      gol.equipoJugadorNombre,
      gol.rivalNombre,
      gol.minuto == null ? '—' : `${gol.minuto}'`,
      this.tipo(gol.tipo),
      this.marcador(gol),
    ]);

    const documento: any = {
      pageOrientation: 'landscape',
      pageMargins: [24, 28, 24, 30],
      content: [
        { text: 'HISTORIAL DETALLADO DE GOLES', style: 'title', alignment: 'center' },
        { text: data.ligaNombre, style: 'league', alignment: 'center' },
        {
          text: `${data.campeonatoNombre} · ${data.categoriaNombre}`,
          style: 'subtitle',
          alignment: 'center',
          margin: [0, 2, 0, 2],
        },
        {
          text: data.filtrosDescripcion,
          style: 'filters',
          alignment: 'center',
          margin: [0, 0, 0, 12],
        },
        {
          table: {
            headerRows: 1,
            widths: [48, 66, 100, '*', 86, 78, 30, 48, 48],
            body: [encabezado, ...filas],
          },
          layout: {
            fillColor: (row: number) => row === 0 ? '#1A3A5A' : row % 2 === 0 ? '#F4F7FA' : null,
            hLineColor: () => '#D8E1EA',
            vLineColor: () => '#D8E1EA',
          },
        },
        {
          text: `Registros exportados: ${data.registros.length} · Generado el ${this.fechaActual()}`,
          style: 'footer',
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        title: { fontSize: 16, bold: true, color: '#17324D' },
        league: { fontSize: 10, bold: true, color: '#2474A6' },
        subtitle: { fontSize: 9, color: '#425B70' },
        filters: { fontSize: 8, color: '#61778A' },
        tableHeader: { bold: true, color: '#FFFFFF', fontSize: 7 },
        footer: { fontSize: 7, color: '#6B7C8C' },
      },
      defaultStyle: { fontSize: 7, color: '#263746' },
    };

    pdfMake.createPdf(documento).download(`${this.nombreArchivo(data)}.pdf`);
  }

  descargarExcel(data: HistorialGolesExportables): void {
    const filas = data.registros.map((gol) => [
      this.fechaPartido(gol.fechaPartido),
      gol.horaPartido ?? '',
      this.etapa(gol.etapa),
      gol.jornada,
      gol.partidoId,
      gol.localNombre,
      gol.visitanteNombre,
      gol.jugadorNombre,
      gol.equipoJugadorNombre,
      gol.rivalNombre,
      gol.minuto ?? '',
      this.tipo(gol.tipo),
      gol.tipo === 'autogol' ? gol.equipoBeneficiadoNombre : '',
      gol.golesLocal ?? '',
      gol.golesVisitante ?? '',
      gol.activo ? 'Activo' : 'Inactivo',
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([
      ['HISTORIAL DETALLADO DE GOLES'],
      ['Liga', data.ligaNombre],
      ['Campeonato', data.campeonatoNombre],
      ['Categoría', data.categoriaNombre],
      ['Filtros', data.filtrosDescripcion],
      ['Generado el', this.fechaActual()],
      [],
      [
        'Fecha', 'Hora', 'Etapa', 'Jornada', 'Partido ID', 'Local', 'Visitante',
        'Jugador', 'Equipo del jugador', 'Rival', 'Minuto', 'Tipo',
        'Equipo beneficiado (autogol)', 'Goles local', 'Goles visitante', 'Estado',
      ],
      ...filas,
    ]);
    hoja['!cols'] = [
      { wch: 12 }, { wch: 9 }, { wch: 20 }, { wch: 10 }, { wch: 11 },
      { wch: 25 }, { wch: 25 }, { wch: 32 }, { wch: 25 }, { wch: 25 },
      { wch: 9 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 11 },
    ];
    hoja['!merges'] = [XLSX.utils.decode_range('A1:P1')];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial de goles');
    XLSX.writeFile(libro, `${this.nombreArchivo(data)}.xlsx`);
  }

  private tipo(tipo: HistorialGolItem['tipo']): string {
    if (tipo === 'penal') return 'Penal';
    if (tipo === 'autogol') return 'Autogol';
    return 'Normal';
  }

  private etapa(valor: string): string {
    return valor ? valor.replace(/_/g, ' ').replace(/\b\w/g, letra => letra.toUpperCase()) : 'Sin etapa';
  }

  private marcador(gol: HistorialGolItem): string {
    return gol.golesLocal == null || gol.golesVisitante == null
      ? '—'
      : `${gol.golesLocal}-${gol.golesVisitante}`;
  }

  private fechaPartido(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  private fechaActual(): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());
  }

  private nombreArchivo(data: HistorialGolesExportables): string {
    return `HISTORIAL_GOLES_${data.campeonatoNombre}_${data.categoriaNombre}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase();
  }
}
