import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SancionesService } from '../sanciones.service';
import { Sancion, FiltrosSanciones, TipoSancion, ReglaSancion, ApelarSancionDto } from '../sancion.model';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-sanciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './sanciones-list.component.html',
  styleUrl: './sanciones-list.component.scss',
})
export class SancionesListComponent implements OnInit {
  sanciones: Sancion[] = [];
  tipos: TipoSancion[] = [];
  reglas: ReglaSancion[] = []; // Reglas de acumulación (cargadas junto con las sanciones)
  campeonatos: any[] = [];
  ligas: any[] = [];

  user$: Observable<any>;
  filtros: FiltrosSanciones = {};
  filtroCampeonatoId: number | null = null;
  filtroTipoId: number | null = null;
  filtroLigaId: number | null = null;
  soloActivas = false;
  incluirAnuladas = false;

  // Filtros client-side
  busqueda = '';
  filtroEquipoId: number | null = null;

  // Paginación
  Math = Math;
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];

  get sancionesFiltradasPaginadas(): Sancion[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sancionesFiltradas.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sancionesFiltradas.length / this.pageSize);
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  get equiposDisponibles(): { id: number; nombre: string }[] {
    const mapa = new Map<number, string>();
    for (const s of this.sanciones) {
      if (s.equipo?.id && s.equipo?.nombre) {
        mapa.set(s.equipo.id, s.equipo.nombre);
      }
    }
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get sancionesFiltradas(): Sancion[] {
    const termino = this.busqueda.trim().toLowerCase();
    return this.sanciones.filter(s => {
      if (this.filtroEquipoId && s.equipo?.id !== this.filtroEquipoId) return false;
      if (termino) {
        const enJugador = s.jugador?.nombre?.toLowerCase().includes(termino);
        const enEquipo  = s.equipo?.nombre?.toLowerCase().includes(termino);
        if (!enJugador && !enEquipo) return false;
      }
      return true;
    });
  }

  cargando = false;
  error = '';
  exito = '';

  // ── Apelación ────────────────────────────────────────────────────────────────
  sancionApelando: Sancion | null = null;
  apelarForm: ApelarSancionDto = { tipoSancionId: 0 };
  apelando = false;
  errorApelacion = '';
  reglasFiltradas: any[] = [];  // reglas del tipo seleccionado en el modal

  abrirApelar(sancion: Sancion): void {
    this.sancionApelando = sancion;
    this.reglasFiltradas = [];
    this.apelarForm = {
      tipoSancionId: sancion.tipoSancionId,
      reglaSancionId: sancion.reglaSancionId,
      partidosSuspension: sancion.partidosSuspension,
      descripcion: '',
      fechaSancion: new Date().toLocaleDateString('en-CA'),
    };
    this.errorApelacion = '';
    // Cargar las reglas del tipo original al abrir
    if (sancion.tipoSancionId) {
      this.cargarReglasPorTipo(sancion.tipoSancionId);
    }
  }

  onApelarTipoChange(tipoId: number): void {
    this.apelarForm.reglaSancionId = undefined;
    this.reglasFiltradas = [];
    if (tipoId) this.cargarReglasPorTipo(Number(tipoId));
  }

  private cargarReglasPorTipo(tipoSancionId: number): void {
    const ligaId = this.ligaIdEfectivo;
    if (!ligaId) return;
    const campeonatoId = this.filtroCampeonatoId ?? undefined;
    this.sancionesService.getReglas(ligaId, campeonatoId).subscribe({
      next: (reglas) => {
        this.reglasFiltradas = reglas.filter(r => r.tipoSancionId === tipoSancionId);
      },
    });
  }

  onApelarReglaChange(reglaId: number | undefined): void {
    if (!reglaId) return;
    const regla = this.reglasFiltradas.find(r => r.id === Number(reglaId));
    if (!regla) return;
    if (regla.modoCastigo === 'tiempo' && regla.duracionMeses) {
      const inicio = new Date();
      const fin = new Date(inicio);
      fin.setMonth(fin.getMonth() + regla.duracionMeses);
      this.apelarForm.partidosSuspension = 0;
      this.apelarForm.fechaInicioSuspension = inicio.toISOString().substring(0, 10);
      this.apelarForm.fechaFinSuspension   = fin.toISOString().substring(0, 10);
    } else if (regla.partidosSuspension != null) {
      this.apelarForm.partidosSuspension    = regla.partidosSuspension;
      this.apelarForm.fechaInicioSuspension = undefined;
      this.apelarForm.fechaFinSuspension    = undefined;
    }
  }

  cerrarApelar(): void {
    this.sancionApelando = null;
    this.errorApelacion = '';
  }

  confirmarApelar(): void {
    if (!this.sancionApelando) return;
    if (!this.apelarForm.tipoSancionId) {
      this.errorApelacion = 'Debes seleccionar el nuevo tipo de sanción.';
      return;
    }
    this.apelando = true;
    this.errorApelacion = '';
    this.sancionesService.apelarSancion(this.sancionApelando.id, this.apelarForm).subscribe({
      next: () => {
        this.exito = 'Apelación aplicada. Se creó la nueva sanción correctamente.';
        this.cerrarApelar();
        this.cargarSanciones();
        this.apelando = false;
        setTimeout(() => (this.exito = ''), 5000);
      },
      error: (e) => {
        this.errorApelacion = e?.error?.message ?? 'Error al aplicar la apelación.';
        this.apelando = false;
      },
    });
  }

  get isMaster(): boolean {
    return this.permissions.isMaster();
  }

  // Los no-master usan su propio ligaId; el master usa el seleccionado en el filtro
  get ligaIdEfectivo(): number | null {
    if (this.isMaster) return this.filtroLigaId;
    return (this.authService.currentUserValue as any)?.ligaId ?? null;
  }

  constructor(
    private readonly sancionesService: SancionesService,
    private readonly campeonatosService: CampeonatosService,
    private readonly ligasService: LigasService,
    private readonly authService: AuthService,
    private readonly router: Router,
    public readonly permissions: PermissionsService,
  ) {
    this.user$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    if (this.isMaster) {
      this.ligasService.getAll().subscribe({ next: (l) => (this.ligas = l) });
    } else {
      this.cargarTipos();
      this.cargarCampeonatos();
      this.cargarSanciones();
    }
  }

  onLigaChange(): void {
    this.filtroCampeonatoId = null;
    this.campeonatos = [];
    this.tipos = [];
    this.sanciones = [];

    if (!this.filtroLigaId) return;
    this.cargarTipos();
    this.cargarCampeonatos();
    this.cargarSanciones();
  }

  cargarTipos(): void {
    if (!this.ligaIdEfectivo) return;
    this.sancionesService.getTiposSancion(this.ligaIdEfectivo).subscribe({
      next: (t) => (this.tipos = t),
    });
  }

  /**
   * Carga las reglas de sanción de la liga (y campeonato si hay uno seleccionado).
   * Se usa para calcular alertas de acumulación en equipos/barras.
   * Las reglas con acumulacionActiva=true definen el límite de tarjetas.
   */
  cargarReglas(): void {
    if (!this.ligaIdEfectivo) return;
    this.sancionesService.getReglas(
      this.ligaIdEfectivo,
      this.filtroCampeonatoId ?? undefined,
    ).subscribe({
      next: (r) => (this.reglas = r),
      error: () => (this.reglas = []),
    });
  }

  cargarCampeonatos(): void {
    if (!this.ligaIdEfectivo) return;
    this.campeonatosService.getByLiga(this.ligaIdEfectivo).subscribe({
      next: (c) => (this.campeonatos = c),
    });
  }

  cargarSanciones(): void {
    if (!this.ligaIdEfectivo) return;
    this.cargando = true;
    const filtros: FiltrosSanciones = { ligaId: this.ligaIdEfectivo };
    if (this.filtroCampeonatoId) filtros.campeonatoId = this.filtroCampeonatoId;
    if (this.filtroTipoId) filtros.tipoSancionId = this.filtroTipoId;
    if (this.soloActivas) filtros.soloActivas = true;
    if (this.incluirAnuladas) filtros.incluirAnuladas = true;

    // Cargar reglas en paralelo para calcular alertas de acumulación
    this.cargarReglas();

    this.sancionesService.getSanciones(filtros).subscribe({
      next: (s) => {
        this.sanciones = s;
        this.currentPage = 1;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar las sanciones.';
        this.cargando = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.cargarSanciones();
  }

  limpiarFiltros(): void {
    this.filtroCampeonatoId = null;
    this.filtroTipoId = null;
    this.soloActivas = false;
    this.incluirAnuladas = false;
    this.busqueda = '';
    this.filtroEquipoId = null;
    this.currentPage = 1;
    this.reglas = []; // Al limpiar sin campeonato, las alertas ya no aplican
    this.cargarSanciones();
  }

  anular(sancion: Sancion): void {
    if (!confirm(`¿Anular la sanción? Esta acción no se puede revertir.`)) return;
    this.sancionesService.deleteSancion(sancion.id).subscribe({
      next: () => {
        this.exito = 'Sanción anulada correctamente.';
        sancion.activo = false;
        setTimeout(() => (this.exito = ''), 3000);
      },
      error: () => (this.error = 'Error al anular la sanción.'),
    });
  }

  transferir(sancion: Sancion): void {
    if (!this.filtroCampeonatoId) {
      this.error = 'Selecciona primero el campeonato destino en los filtros.';
      return;
    }
    if (!confirm(
      `¿Transferir la suspensión de "${this.sancionadoLabel(sancion)}" al campeonato seleccionado? ` +
      `Se creará una nueva sanción con los partidos/tiempo pendientes.`,
    )) return;

    this.sancionesService.transferirSancion(sancion.id, this.filtroCampeonatoId).subscribe({
      next: () => {
        this.exito = 'Suspensión transferida correctamente.';
        this.cargarSanciones();
        setTimeout(() => (this.exito = ''), 4000);
      },
      error: (e) => (this.error = e?.error?.message ?? 'Error al transferir la sanción.'),
    });
  }

  colorTipo(aplicaA: string): string {
    const mapa: Record<string, string> = {
      jugador: '#f59e0b',
      equipo: '#3b82f6',
      directivo: '#8b5cf6',
      barra: '#ef4444',
    };
    return mapa[aplicaA] ?? '#64748b';
  }

  /**
   * Calcula alertas de acumulación para equipos/barras/directivos.
   *
   * Lógica:
   *  1. Filtra reglas con acumulacionActiva=true que apliquen a NO-jugadores.
   *  2. Para cada regla, cuenta cuántas sanciones de ese tipo tiene cada equipo
   *     en el conjunto de sanciones actualmente cargado.
   *  3. Si un equipo llega o supera el límite (acumulacionCantidad), genera una alerta.
   *
   * No requiere ningún endpoint nuevo: usa los datos ya en memoria.
   */
  /** Calcula el nivel visual de una alerta según cuánto se acerca al límite */
  nivelAlerta(total: number, limite: number): 'info' | 'warn' | 'danger' {
    if (total >= limite) return 'danger';
    if (total >= Math.ceil(limite / 2)) return 'warn';
    return 'info';
  }

  get alertasAcumulacion(): { equipo: string; campeonato: string; tipo: string; aplicaA: string; total: number; limite: number; nivel: 'info' | 'warn' | 'danger' }[] {
    if (!this.ligaIdEfectivo) return [];

    const alertas: { equipo: string; campeonato: string; tipo: string; aplicaA: string; total: number; limite: number; nivel: 'info' | 'warn' | 'danger' }[] = [];

    // Reglas de acumulación activa para tipos que NO son jugador.
    // Si hay varias reglas del mismo tipoSancionId (ej: "1ra roja", "2da roja"),
    // se deduplica por tipo quedando la de mayor acumulacionCantidad,
    // ya que el total de sanciones del equipo es el mismo para todas.
    const reglasRaw = this.reglas.filter(r =>
      r.acumulacionActiva &&
      r.acumulacionCantidad &&
      r.tipoSancion?.aplicaA !== 'jugador',
    );
    const reglaPorTipo = new Map<number, typeof reglasRaw[0]>();
    for (const r of reglasRaw) {
      const prev = reglaPorTipo.get(r.tipoSancionId);
      if (!prev || r.acumulacionCantidad! > prev.acumulacionCantidad!) {
        reglaPorTipo.set(r.tipoSancionId, r);
      }
    }
    const reglasAcum = Array.from(reglaPorTipo.values());

    for (const regla of reglasAcum) {
      // Sanciones activas de ese tipo que tengan equipo asignado
      const sancionesTipo = this.sanciones.filter(s =>
        s.tipoSancionId === regla.tipoSancionId &&
        s.activo &&
        s.equipoId,
      );

      // Agrupar por campeonatoId+equipoId para no mezclar campeonatos
      const clave = (s: { campeonatoId: number; equipoId?: number }) =>
        `${s.campeonatoId}-${s.equipoId}`;

      const porGrupo = new Map<string, { equipo: string; campeonato: string; count: number }>();
      for (const s of sancionesTipo) {
        if (!s.equipoId || !s.equipo) continue;
        const k = clave(s);
        const prev = porGrupo.get(k) ?? {
          equipo: s.equipo.nombre,
          campeonato: s.campeonato?.nombre ?? '',
          count: 0,
        };
        porGrupo.set(k, { ...prev, count: prev.count + 1 });
      }

      // Todos los equipos con al menos 1 sanción de este tipo
      for (const [, data] of porGrupo) {
        if (data.count >= 1) {
          alertas.push({
            equipo:     data.equipo,
            campeonato: data.campeonato,
            tipo:       regla.tipoSancion?.nombre ?? 'Sanción',
            aplicaA:    regla.tipoSancion?.aplicaA ?? 'equipo',
            total:      data.count,
            limite:     regla.acumulacionCantidad!,
            nivel:      this.nivelAlerta(data.count, regla.acumulacionCantidad!),
          });
        }
      }
    }

    // Ordenar: danger primero, luego warn, luego info
    const orden = { danger: 0, warn: 1, info: 2 };
    return alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  }

  sancionadoLabel(s: Sancion): string {
    if (s.jugador) return `${s.jugador.nombre}`;
    if (s.equipo) return s.equipo.nombre;
    return '—';
  }
}
