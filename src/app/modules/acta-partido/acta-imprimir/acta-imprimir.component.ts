import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActaPartidoService } from '../acta-partido.service';

@Component({
  selector: 'app-acta-imprimir',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acta-imprimir.component.html',
  styleUrls: ['./acta-imprimir.component.scss'],
  providers: [DatePipe],
})
export class ActaImprimirComponent implements OnInit {
  readonly equiposVocalia: Array<'local' | 'visitante'> = ['local', 'visitante'];
  partidoId!: number;
  partido: any = null;
  jugadoresLocal: any[] = [];
  jugadoresVisitante: any[] = [];

  loading = true;
  error = '';

  /** Campo editable del vocal — pre-llenado desde el informe guardado, editable antes de imprimir */
  vocalEditable = '';

  /** Mínimo de filas visibles por equipo en la tabla de jugadores */
  readonly MIN_FILAS = 22;

  /** Valores predeterminados de la planilla vocalia (configurables por liga en el futuro) */
  readonly valoresVocalia = [
    { label: '1.-Valor Arbitraje',     valor: 9.00 },
    { label: '2.-Aporte a la Liga',    valor: 2.00 },
    { label: '3.-Valor premios',       valor: 2.00 },
    { label: '4.-Seguro médico',       valor: 1.00 },
    { label: '5.-Fondo de accidentes', valor: 1.00 },
    { label: '6.-TARGETAS TA / TR',    valor: null },
    { label: '7.-OTROS',               valor: null },
  ];

  readonly filasExtrasVocalia = Array.from({ length: 5 });
  readonly totalFijoVocalia = this.valoresVocalia
    .slice(0, 5)
    .reduce((sum, item) => sum + (item.valor ?? 0), 0);

  vocaliaLocal = {
    tarjetas: null as number | null,
    extras: Array.from({ length: 5 }, () => ({ detalle: '', valor: null as number | null })),
  };

  vocaliaVisitante = {
    tarjetas: null as number | null,
    extras: Array.from({ length: 5 }, () => ({ detalle: '', valor: null as number | null })),
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actaService: ActaPartidoService,
  ) {}

  ngOnInit(): void {
    this.partidoId = Number(this.route.snapshot.paramMap.get('partidoId'));
    this.cargarPlantilla();
    this.cargarVocal();
  }

  private cargarVocal(): void {
    this.actaService.obtenerInforme(this.partidoId).subscribe({
      next: (res) => {
        if (res.informe?.vocalNombre) {
          this.vocalEditable = res.informe.vocalNombre;
        }
        // Si no hay vocal guardado, se deja vacío para que el usuario lo escriba manualmente
      },
      error: () => { /* sin informe, se queda con valor por defecto */ },
    });
  }

  /**
   * La vista de impresión siempre intenta mostrar la plantilla COMPLETA de
   * jugadores habilitados (igual que el acta física).
   * Si por algún motivo no hay jugadores habilitados aún, cae automáticamente
   * a la alineación guardada para no dejar el acta vacía.
   */
  private cargarPlantilla(): void {
    this.actaService.obtenerJugadoresDisponibles(this.partidoId).subscribe({
      next: (res) => {
        this.partido = res.partido;
        if (res.jugadoresLocal.length > 0 || res.jugadoresVisitante.length > 0) {
          this.jugadoresLocal     = this.ordenarPorNumero(res.jugadoresLocal);
          this.jugadoresVisitante = this.ordenarPorNumero(res.jugadoresVisitante);
          this.loading = false;
        } else {
          // No hay jugadores habilitados aún: usar la alineación guardada como respaldo
          this.cargarDesdeAlineacionGuardada();
        }
      },
      error: () => this.cargarDesdeAlineacionGuardada(),
    });
  }

  /** Fallback: carga la alineación ya guardada si no hay plantilla habilitada */
  private cargarDesdeAlineacionGuardada(): void {
    this.actaService.obtenerAlineacion(this.partidoId).subscribe({
      next: (res) => {
        this.partido = res.partido;
        this.jugadoresLocal     = this.ordenarPorNumero(res.jugadoresLocal);
        this.jugadoresVisitante = this.ordenarPorNumero(res.jugadoresVisitante);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al cargar los datos del partido';
        this.loading = false;
      },
    });
  }

  /** Ordena jugadores por número de camiseta (numeroCancha) de menor a mayor */
  private ordenarPorNumero(jugadores: any[]): any[] {
    return [...jugadores].sort((a, b) => (a.numeroCancha ?? 99) - (b.numeroCancha ?? 99));
  }

  /** Rellena con filas vacías hasta MIN_FILAS para que el acta siempre tenga suficiente espacio */
  get filasLocal(): (any | null)[] {
    const filas: (any | null)[] = [...this.jugadoresLocal];
    while (filas.length < this.MIN_FILAS) filas.push(null);
    return filas;
  }

  get filasVisitante(): (any | null)[] {
    const filas: (any | null)[] = [...this.jugadoresVisitante];
    while (filas.length < this.MIN_FILAS) filas.push(null);
    return filas;
  }

  // ── Helpers de datos ──────────────────────────────────────────────────────

  get ligaNombre(): string {
    return (this.partido?.campeonato?.liga?.nombre ?? '').toUpperCase();
  }

  get ligaLogo(): string {
    return this.partido?.campeonato?.liga?.imagen ?? '';
  }

  get ligaFundacion(): string {
    const f = this.partido?.campeonato?.liga?.fechaFundacion;
    if (!f) return '';
    // Extraer partes directamente para evitar desfase por zona horaria UTC
    const partes = String(f).split('T')[0].split('-').map(Number);
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  }

  get ligaUbicacion(): string {
    return (this.partido?.campeonato?.liga?.ubicacion ?? '').toUpperCase();
  }

  get categoriaNombre(): string {
    return (this.partido?.categoria?.nombre ?? '').toUpperCase();
  }

  get etapaLabel(): string {
    const e = this.partido?.etapa ?? '';
    return e.toUpperCase().replace(/_/g, ' ');
  }

  get fechaLabel(): string {
    const f = this.partido?.fechaPartido;
    if (!f) return '';
    const d = new Date(f + 'T12:00:00');
    return d.toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: '2-digit', year: '2-digit' }).toUpperCase();
  }

  get equipoLocalNombre(): string {
    return (this.partido?.equipoLocal?.nombre ?? '').toUpperCase();
  }

  get equipoVisitanteNombre(): string {
    return (this.partido?.equipoVisitante?.nombre ?? '').toUpperCase();
  }

  nombreJugador(fila: any): string {
    if (!fila) return '';
    const j = fila.jugador ?? fila;
    // El backend puede devolver el nombre en distintos formatos según el endpoint:
    // - campo 'nombre' (campo único en la entidad Jugador)
    // - campos 'apellidos' + 'nombres' (formato separado)
    // - campo 'nombreCompleto' (propiedad virtual)
    if (j.apellidos || j.nombres) {
      return `${j.apellidos ?? ''} ${j.nombres ?? ''}`.trim();
    }
    return (j.nombre ?? j.nombreCompleto ?? '').trim();
  }

  numeroCancha(fila: any): string {
    if (!fila) return '';
    return fila.numeroCancha != null ? String(fila.numeroCancha) : '';
  }

  getFilasVocalia(equipo: 'local' | 'visitante') {
    const vocalia = equipo === 'local' ? this.vocaliaLocal : this.vocaliaVisitante;

    return [
      ...this.valoresVocalia.slice(0, 5).map((item) => ({
        label: item.label,
        valor: item.valor,
      })),
      {
        label: this.valoresVocalia[5].label,
        valor: vocalia.tarjetas,
      },
      {
        label: this.valoresVocalia[6].label,
        valor: null,
      },
      ...vocalia.extras.map((extra) => ({
        label: extra.detalle,
        valor: extra.valor,
      })),
    ];
  }

  getTotalVocalia(equipo: 'local' | 'visitante'): number {
    const vocalia = equipo === 'local' ? this.vocaliaLocal : this.vocaliaVisitante;
    const totalExtras = vocalia.extras.reduce((sum, extra) => sum + (extra.valor ?? 0), 0);
    return this.totalFijoVocalia + (vocalia.tarjetas ?? 0) + totalExtras;
  }

  imprimir(): void {
    window.print();
  }

  volver(): void {
    this.router.navigate(['/partidos', this.partidoId, 'acta']);
  }
}
