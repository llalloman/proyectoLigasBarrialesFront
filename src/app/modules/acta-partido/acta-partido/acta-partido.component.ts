import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActaPartidoService } from '../acta-partido.service';
import { AuthService } from '../../../core/services/auth.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';
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

interface ResumenEquipoAlineacion {
  participaron: number;
  noJugaron: number;
  ausentes: number;
  lesionados: number;
  suspendidos: number;
  expulsados: number;
}

@Component({
  selector: 'app-acta-partido',
  standalone: true,
  imports: [CommonModule, FormsModule, MainNavComponent, RouterLink, SearchableSelectComponent],
  templateUrl: './acta-partido.component.html',
  styleUrls: ['./acta-partido.component.scss'],
})
export class ActaPartidoComponent implements OnInit {
  user$: Observable<any>;

  partidoId!: number;
  partido: any = null;
  parametrosRetorno: Record<string, string | number> = {};

  // ── Planilla ──────────────────────────────────────────────────────────────
  filasLocal: FilaAlineacion[] = [];
  filasVisitante: FilaAlineacion[] = [];

  loading = false;
  guardando = false;
  guardado = false;
  plantillaGuardada = false;
  /** Solo habilita una corrección durante la visita actual al acta. */
  plantillaCorreccionDesbloqueada = false;
  motivoCorreccion = '';
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
    private permissions: PermissionsService,
  ) {
    this.user$ = this.authService.currentUser$;
  }

  get soloLectura(): boolean {
    return this.permissions.hasRole(['dirigente_equipo', 'tribuna_penas', 'tesoreria']);
  }

  get puedeImprimirActa(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga', 'tribuna_penas', 'tesoreria']);
  }

  get planillaEstaBloqueada(): boolean {
    return this.partido?.estado === 'jugado' && !this.plantillaCorreccionDesbloqueada;
  }

  desbloquearCorreccionPlanilla(): void {
    const confirmar = window.confirm(
      'Este partido ya fue jugado. Corregir la plantilla puede afectar la trazabilidad y las sanciones. ¿Desea habilitar su corrección?',
    );
    if (confirmar) this.plantillaCorreccionDesbloqueada = true;
  }

  bloquearCorreccionPlanilla(): void {
    this.plantillaCorreccionDesbloqueada = false;
    this.motivoCorreccion = '';
  }

  logout(): void {
    this.authService.logout();
  }

  private get ligaId(): number {
    return (this.authService.currentUserValue as any)?.ligaId;
  }

  ngOnInit(): void {
    this.partidoId = Number(this.route.snapshot.paramMap.get('partidoId'));
    this.parametrosRetorno = { ...this.route.snapshot.queryParams };
    this.cargarAlineacion();
    this.cargarInforme();
    // cargarEquiposVocal se llama desde cargarAlineacion una vez que 'partido' está disponible
  }

  // ── Planilla ──────────────────────────────────────────────────────────────

  cargarAlineacion(): void {
    this.loading = true;
    this.error = '';

    this.actaService.obtenerAlineacion(this.partidoId).subscribe({
      next: (res) => {
        this.partido = res.partido;
        this.plantillaGuardada = res.jugadoresLocal.length > 0 || res.jugadoresVisitante.length > 0;
        this.cargarEquiposVocal();

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

  // Carga todos los equipos de la liga del partido.
  // Para usuarios con ligaId propio lo usa directamente;
  // para el master (sin ligaId) lo obtiene de partido.campeonato.ligaId.
  private cargarEquiposVocal(): void {
    const ligaId = this.ligaId ?? this.partido?.campeonato?.ligaId;
    if (!ligaId) return;
    this.equiposService.getByLiga(ligaId).subscribe({
      next: (equipos) => {
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
        this.cargarEquiposVocal();
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
    if (
      this.partido?.estado === 'jugado' &&
      this.plantillaCorreccionDesbloqueada &&
      this.motivoCorreccion.trim().length < 5
    ) {
      this.error = 'Ingrese un motivo de al menos 5 caracteres para guardar la corrección.';
      return;
    }

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

    this.actaService.guardarAlineacion(this.partidoId, {
      jugadores,
      permitirCorreccion: this.plantillaCorreccionDesbloqueada,
      motivoCorreccion: this.plantillaCorreccionDesbloqueada
        ? this.motivoCorreccion.trim()
        : undefined,
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.guardado = true;
        this.plantillaGuardada = true;
        this.plantillaCorreccionDesbloqueada = false;
        this.motivoCorreccion = '';
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
        }
        if (res.informe?.vocalNombre) {
          this.vocalNombre = res.informe.vocalNombre;
          this.vocalEquipoId = res.informe.vocalEquipoId ?? null;
        } else if (res.vocaliaProgramada) {
          this.vocalNombre = res.vocaliaProgramada.tipoAsignacion === 'directivo'
            ? res.vocaliaProgramada.directivoNombre ?? ''
            : res.vocaliaProgramada.equipoVocal?.nombre ?? '';
          this.vocalEquipoId = res.vocaliaProgramada.equipoVocalId ?? null;
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
  get todosLosJugadores(): { jugadorId: number; nombre: string; equipoId: number; suspendido: boolean; numeroCancha: number | null }[] {
    return [...this.filasLocal, ...this.filasVisitante].map((f) => ({
      jugadorId:    f.jugadorId,
      nombre:       f.nombreCompleto,
      equipoId:     f.equipoId,
      suspendido:   f.estadoSugerido === 'suspendido',
      numeroCancha: f.numeroCancha ?? null,
    }));
  }

  /** Devuelve los jugadores del equipo seleccionado para el selector de incidencia.
   *  Los suspendidos se incluyen (pueden cometer faltas fuera del campo)
   *  pero se marcan con (SUSPENDIDO) para diferenciarlos visualmente.
   *  Se incluye el número de camiseta de la habilitación para identificar al jugador. */
  jugadoresPorEquipo(equipoId: number | string): { jugadorId: number; nombre: string; suspendido: boolean }[] {
    const numId = Number(equipoId);
    return this.todosLosJugadores
      .filter((j) => Number(j.equipoId) === numId)
      .map((j) => {
        const num    = j.numeroCancha != null ? `#${j.numeroCancha} · ` : '';
        const nombre = j.suspendido ? `⚠️ ${num}${j.nombre} (SUSPENDIDO)` : `${num}${j.nombre}`;
        return { jugadorId: j.jugadorId, nombre, suspendido: j.suspendido };
      });
  }

  get equiposVocalSearchOptions(): SearchableSelectOption[] {
    return this.equiposVocal.map((equipo) => ({
      value: equipo.id,
      label: equipo.nombre,
      secondary: equipo.representante || equipo.nombreRepresentante || undefined,
      searchText: `${equipo.nombre ?? ''} ${equipo.representante ?? ''} ${equipo.nombreRepresentante ?? ''}`,
    }));
  }

  jugadoresIncidenciaSearchOptions(equipoId: number | string): SearchableSelectOption[] {
    return this.jugadoresPorEquipo(equipoId).map((jugador) => ({
      value: jugador.jugadorId,
      label: jugador.nombre,
      secondary: jugador.suspendido ? 'Jugador suspendido' : undefined,
      searchText: jugador.nombre,
    }));
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
    this.router.navigate(['/partidos'], { queryParams: this.parametrosRetorno });
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

  get resumenLocal(): ResumenEquipoAlineacion {
    return this.calcularResumenEquipo(this.filasLocal);
  }

  get resumenVisitante(): ResumenEquipoAlineacion {
    return this.calcularResumenEquipo(this.filasVisitante);
  }

  private calcularResumenEquipo(filas: FilaAlineacion[]): ResumenEquipoAlineacion {
    const contar = (estado: EstadoAlineacion) =>
      filas.filter((fila) => fila.estadoSeleccionado === estado).length;
    const expulsados = contar('expulsado');

    return {
      participaron: contar('jugo') + expulsados,
      noJugaron: contar('no_jugo'),
      ausentes: contar('ausente'),
      lesionados: contar('lesionado'),
      suspendidos: contar('suspendido'),
      expulsados,
    };
  }
}
