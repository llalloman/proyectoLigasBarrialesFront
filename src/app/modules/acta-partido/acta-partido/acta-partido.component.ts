import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActaPartidoService } from '../acta-partido.service';
import { AuthService } from '../../../core/services/auth.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  ActaIncidencia,
  ActaInformePartido,
  EstadoAlineacion,
  EstadoInforme,
  ESTADO_ALINEACION_LABELS,
  FilaAlineacion,
  FilaIncidencia,
  GuardarInformePartidoDto,
  JugadorDisponible,
  TIPO_INCIDENCIA_LABELS,
  TipoIncidencia,
} from '../acta-partido.model';

@Component({
  selector: 'app-acta-partido',
  standalone: true,
  imports: [CommonModule, FormsModule, MainNavComponent, RouterLink],
  templateUrl: './acta-partido.component.html',
  styleUrls: ['./acta-partido.component.scss'],
})
export class ActaPartidoComponent implements OnInit {
  user$: Observable<any>;

  partidoId!: number;
  partido: any = null;

  // ── Planilla ──────────────────────────────────────────────────────────────
  filasLocal: FilaAlineacion[] = [];
  filasVisitante: FilaAlineacion[] = [];

  loading = false;
  guardando = false;
  guardado = false;
  error = '';

  // ── Informe del Vocal ──────────────────────────────────────────────────────
  tabActiva: 'planilla' | 'informe' = 'planilla';

  informe: ActaInformePartido | null = null;
  incidenciasGuardadas: ActaIncidencia[] = [];

  observacionesVocal = '';
  nombreArbitro = '';
  observacionesArbitro = '';
  vocalNombre = '';
  vocalEquipoId: number | null = null;
  equiposVocal: any[] = [];
  filasIncidencias: FilaIncidencia[] = [];

  guardandoInforme = false;
  guardadoInforme = false;
  errorInforme = '';

  readonly estadoInfomreLabels: Record<EstadoInforme, string> = {
    borrador:          '📝 Borrador',
    enviado_tribunal:  '📤 Enviado al Tribunal',
    resuelto:          '✅ Resuelto',
  };

  readonly tiposIncidencia: TipoIncidencia[] = [
    'tarjeta_amarilla',
    'tarjeta_roja',
    'doble_amarilla',
    'expulsion_directa',
    'incidencia_grave',
    'otro',
  ];
  readonly tipoLabels = TIPO_INCIDENCIA_LABELS;

  // ── Planilla labels ────────────────────────────────────────────────────────
  readonly estadoLabels = ESTADO_ALINEACION_LABELS;
  readonly estados: EstadoAlineacion[] = [
    'jugo',
    'no_jugo',
    'suspendido',
    'ausente',
    'lesionado',
    'expulsado',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actaService: ActaPartidoService,
    private authService: AuthService,
    private equiposService: EquiposService,
  ) {
    this.user$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }

  private get ligaId(): number {
    return (this.authService.currentUserValue as any)?.ligaId;
  }

  ngOnInit(): void {
    this.partidoId = Number(this.route.snapshot.paramMap.get('partidoId'));
    this.cargarAlineacion();
    this.cargarInforme();
    this.cargarEquiposVocal();
  }

  // ── Planilla ──────────────────────────────────────────────────────────────

  cargarAlineacion(): void {
    this.loading = true;
    this.error = '';

    this.actaService.obtenerAlineacion(this.partidoId).subscribe({
      next: (res) => {
        this.partido = res.partido;
        this.filtrarEquiposVocal();

        if (res.jugadoresLocal.length > 0 || res.jugadoresVisitante.length > 0) {
          this.filasLocal = res.jugadoresLocal.map((r) => this.filaDesdeRegistro(r));
          this.filasVisitante = res.jugadoresVisitante.map((r) => this.filaDesdeRegistro(r));
        } else {
          this.preCargardDesdeHabilitados();
          return;
        }
        this.loading = false;
      },
      error: () => {
        this.preCargardDesdeHabilitados();
      },
    });
  }

  // Carga todos los equipos de la liga y espera a que 'partido' esté disponible
  // para filtrar los dos equipos contendientes, dejando solo los válidos para vocal.
  private cargarEquiposVocal(): void {
    if (!this.ligaId) return;
    this.equiposService.getByLiga(this.ligaId).subscribe({
      next: (equipos) => {
        // Se filtran en cuanto llegue 'partido'; si aún no llegó, se filtra después
        this.equiposVocal = equipos;
        this.filtrarEquiposVocal();
      },
    });
  }

  // Excluye local y visitante del partido actual de la lista de equipos vocal.
  private filtrarEquiposVocal(): void {
    if (!this.partido || this.equiposVocal.length === 0) return;
    const excluir = new Set([this.partido.equipoLocalId, this.partido.equipoVisitanteId]);
    this.equiposVocal = this.equiposVocal.filter((e) => !excluir.has(e.id));
  }

  private preCargardDesdeHabilitados(): void {
    this.actaService.obtenerJugadoresDisponibles(this.partidoId).subscribe({
      next: (res) => {
        this.partido = res.partido;
        this.filtrarEquiposVocal();
        this.filasLocal = res.jugadoresLocal.map((j) => this.filaDesdeDisponible(j));
        this.filasVisitante = res.jugadoresVisitante.map((j) => this.filaDesdeDisponible(j));
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al cargar los jugadores del partido';
        this.loading = false;
      },
    });
  }

  guardar(): void {
    this.guardando = true;
    this.guardado = false;
    this.error = '';

    const jugadores = [...this.filasLocal, ...this.filasVisitante].map((f) => ({
      jugadorId: f.jugadorId,
      equipoId: f.equipoId,
      estado: f.estadoSeleccionado,
      numeroCancha: f.numeroCancha ?? undefined,
      observaciones: f.observaciones || undefined,
    }));

    this.actaService.guardarAlineacion(this.partidoId, { jugadores }).subscribe({
      next: () => {
        this.guardando = false;
        this.guardado = true;
        setTimeout(() => (this.guardado = false), 3000);
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message ?? 'Error al guardar la planilla';
      },
    });
  }

  // ── Informe del Vocal ─────────────────────────────────────────────────────

  cargarInforme(): void {
    this.actaService.obtenerInforme(this.partidoId).subscribe({
      next: (res) => {
        if (!this.partido) this.partido = res.partido;
        this.informe = res.informe;
        this.incidenciasGuardadas = res.incidencias;

        if (res.informe) {
          this.observacionesVocal   = res.informe.observacionesVocal  ?? '';
          this.nombreArbitro        = res.informe.nombreArbitro        ?? '';
          this.observacionesArbitro = res.informe.observacionesArbitro ?? '';
          this.vocalNombre          = res.informe.vocalNombre          ?? '';
          this.vocalEquipoId        = res.informe.vocalEquipoId        ?? null;
        }

        // Pre-cargar las incidencias 'pendiente' para edición
        this.filasIncidencias = res.incidencias
          .filter((i) => i.estadoResolucion === 'pendiente')
          .map((i) => ({
            equipoId:       i.equipoId,
            jugadorId:      i.jugadorId ?? null,
            tipoIncidencia: i.tipoIncidencia,
            minuto:         i.minuto ?? null,
            descripcion:    i.descripcion ?? '',
          }));
      },
      error: () => { /* sin informe previo, nada que hacer */ },
    });
  }

  agregarIncidencia(): void {
    // Usar el primer equipo local disponible como valor por defecto
    const equipoId = this.partido?.equipoLocalId ?? 0;
    this.filasIncidencias.push({
      equipoId,
      jugadorId:      null,
      tipoIncidencia: 'tarjeta_roja',
      minuto:         null,
      descripcion:    '',
    });
  }

  quitarIncidencia(i: number): void {
    this.filasIncidencias.splice(i, 1);
  }

  guardarInforme(enviarATribunal = false): void {
    this.guardandoInforme = true;
    this.guardadoInforme  = false;
    this.errorInforme     = '';

    const dto: GuardarInformePartidoDto = {
      observacionesVocal:   this.observacionesVocal   || undefined,
      nombreArbitro:        this.nombreArbitro         || undefined,
      observacionesArbitro: this.observacionesArbitro  || undefined,
      vocalNombre:          this.vocalNombre           || undefined,
      vocalEquipoId:        this.vocalEquipoId         ?? undefined,
      enviarATribunal:      enviarATribunal || undefined,
      incidencias: this.filasIncidencias.map((f) => ({
        equipoId:       f.equipoId,
        jugadorId:      f.jugadorId,
        tipoIncidencia: f.tipoIncidencia,
        minuto:         f.minuto ?? null,
        descripcion:    f.descripcion || '',
      })),
    };

    this.actaService.guardarInforme(this.partidoId, dto).subscribe({
      next: (res) => {
        this.informe = res.informe;
        this.guardandoInforme = false;
        this.guardadoInforme  = true;
        setTimeout(() => (this.guardadoInforme = false), 3000);
      },
      error: (err) => {
        this.guardandoInforme = false;
        this.errorInforme = err?.error?.message ?? 'Error al guardar el informe';
      },
    });
  }

  /** Jugadores de ambos equipos para los selectores de incidencia */
  get todosLosJugadores(): { jugadorId: number; nombre: string; equipoId: number }[] {
    return [...this.filasLocal, ...this.filasVisitante].map((f) => ({
      jugadorId: f.jugadorId,
      nombre:    f.nombreCompleto,
      equipoId:  f.equipoId,
    }));
  }

  /** Devuelve solo los jugadores del equipo seleccionado para el selector de incidencia */
  jugadoresPorEquipo(equipoId: number | string): { jugadorId: number; nombre: string }[] {
    const numId = Number(equipoId);
    return this.todosLosJugadores
      .filter((j) => Number(j.equipoId) === numId)
      .map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre }));
  }

  /** Al cambiar el equipo de una incidencia, resetea el jugador para evitar datos cruzados */
  onEquipoIncidenciaChange(fila: FilaIncidencia): void {
    fila.jugadorId = null;
  }

  get puedeEnviarTribunal(): boolean {
    return !this.informe || this.informe.estado === 'borrador';
  }

  get estadoInformeLabel(): string {
    return this.informe
      ? this.estadoInfomreLabels[this.informe.estado]
      : '📝 Sin informe';
  }

  volver(): void {
    this.router.navigate(['/partidos']);
  }

  // ── Helpers planilla ───────────────────────────────────────────────────────

  private filaDesdeDisponible(j: JugadorDisponible): FilaAlineacion {
    return {
      jugadorId: j.jugadorId,
      equipoId: j.equipoId,
      nombreCompleto: j.jugador?.nombre ?? j.jugador?.nombreCompleto ?? '',
      numeroCancha: j.numeroCancha ?? null,
      estadoSugerido: j.estadoSugerido,
      estadoSeleccionado: j.estadoSugerido,
      observaciones: '',
      sancionActiva: j.sancionActiva,
    };
  }

  private filaDesdeRegistro(r: any): FilaAlineacion {
    return {
      jugadorId: r.jugadorId,
      equipoId: r.equipoId,
      nombreCompleto: r.jugador?.nombre ?? r.jugador?.nombreCompleto ?? '',
      numeroCancha: r.numeroCancha ?? null,
      estadoSugerido: r.estado,
      estadoSeleccionado: r.estado,
      observaciones: r.observaciones ?? '',
      sancionActiva: null,
    };
  }

  getEstadoClass(estado: EstadoAlineacion): string {
    const map: Record<EstadoAlineacion, string> = {
      jugo:       'estado-jugo',
      no_jugo:    'estado-no-jugo',
      suspendido: 'estado-suspendido',
      ausente:    'estado-ausente',
      lesionado:  'estado-lesionado',
      expulsado:  'estado-expulsado',
    };
    return map[estado] ?? '';
  }

  get totalJugaron(): number {
    return [...this.filasLocal, ...this.filasVisitante].filter(
      (f) => f.estadoSeleccionado === 'jugo' || f.estadoSeleccionado === 'expulsado',
    ).length;
  }

  get totalSuspendidos(): number {
    return [...this.filasLocal, ...this.filasVisitante].filter(
      (f) => f.estadoSeleccionado === 'suspendido',
    ).length;
  }
}
