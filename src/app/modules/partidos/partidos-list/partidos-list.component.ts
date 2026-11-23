import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PartidosService } from '../partidos.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { JugadorCampeonatosService } from '../../jugador-campeonatos/jugador-campeonatos.service';
import { GoleadoresService } from '../../goleadores/goleadores.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Partido, RegistrarResultadoDto, AutorGolDto } from '../partido.model';
import { PartidosExportService } from '../partidos-export.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-partidos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MainNavComponent, SearchableSelectComponent],
  templateUrl: './partidos-list.component.html',
  styleUrls: ['./partidos-list.component.scss'],
})
export class PartidosListComponent implements OnInit {
  partidos: Partido[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;

  // Filtros
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  etapas: string[] = [];
  jornadas: number[] = [];

  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;
  selectedEtapa = '';
  selectedJornada: number | null = null;
  filtroRapidoEstado: 'todos' | 'pendientes' | 'en_juego' | 'jugado' | 'suspendido' = 'todos';

  // Paginación de jornadas
  currentJornadaPage = 1;
  jornadasPerPage = 3;
  private paginaRetornoPendiente: number | null = null;

  // Modal resultado
  resultadoModal: { visible: boolean; partido: Partido | null } = { visible: false, partido: null };
  resultadoForm: RegistrarResultadoDto = { golesLocal: 0, golesVisitante: 0, sancionado: 'ninguno' };
  savingResultado = false;
  /** Protección visual temporal; se restablece al recargar el listado. */
  private partidosDesbloqueados = new Set<number>();

  // Autores de goles
  jugadoresLocal: any[] = [];
  jugadoresVisitante: any[] = [];
  /** Filas internas del formulario (incluye campo 'cantidad' para goles múltiples) */
  autoresGoles: (AutorGolDto & { cantidad: number })[] = [];
  mostrarAutores = false; // Desplegable para el usuario
  errorResultado = '';

  constructor(
    private partidosService: PartidosService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private goleadoresService: GoleadoresService,
    public permissions: PermissionsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private exportService: PartidosExportService,
  ) {}

  get puedeImagenJornada(): boolean { return !!(this.selectedCampeonatoId && this.selectedEtapa && this.selectedJornada); }
  exportarPdf(): void { this.exportService.pdf(this.datosExport()); }
  exportarExcel(): void { this.exportService.excel(this.datosExport()); }
  async exportarImagen(): Promise<void> {
    try {
      await this.exportService.imagen({ ...this.datosExport(), partidos: this.partidosOrdenadosParaImagen() });
    } catch { this.errorMessage = 'No se pudo generar la imagen.'; }
  }
  private datosExport() { const liga = this.ligas.find(l => l.id === this.selectedLigaId); return { liga: liga?.nombre ?? 'Liga Barrial', ligaImagen: liga?.imagen, campeonato: this.campeonatos.find(c => c.id === this.selectedCampeonatoId)?.nombre ?? '', categoria: this.categorias.find(c => c.id === this.selectedCategoriaId)?.nombre ?? 'Todas', etapa: this.selectedEtapa || 'Todas', jornada: this.selectedJornada, partidos: this.partidosFiltrados }; }
  private partidosOrdenadosParaImagen(): Partido[] {
    return [...this.partidosFiltrados].sort((a, b) => {
      const fechaHora = (partido: Partido) => partido.fechaPartido
        ? `${partido.fechaPartido}T${partido.horaPartido ?? '23:59'}`
        : '9999-12-31T23:59';
      return fechaHora(a).localeCompare(fechaHora(b));
    });
  }

  ngOnInit(): void {
    this.loadLigas();
    // Restaurar el contexto al volver desde el acta. Mantiene compatibilidad
    // con campeonatoId, que sigue siendo usado desde generar-fixture.
    this.route.queryParams.subscribe((params) => {
      const campeonatoId = params['volverCampeonatoId'] ?? params['campeonatoId'];
      if (params['volverLigaId']) this.selectedLigaId = +params['volverLigaId'];
      if (params['volverCategoriaId']) this.selectedCategoriaId = +params['volverCategoriaId'];
      if (params['volverEtapa']) this.selectedEtapa = params['volverEtapa'];
      if (params['volverJornada']) this.selectedJornada = +params['volverJornada'];
      if (params['volverEstado']) this.filtroRapidoEstado = params['volverEstado'];
      if (params['volverJornadasPorPagina']) this.jornadasPerPage = +params['volverJornadasPorPagina'];
      this.paginaRetornoPendiente = params['volverPagina'] ? +params['volverPagina'] : null;

      if (campeonatoId) {
        this.selectedCampeonatoId = +campeonatoId;
        if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId);
        this.loadCategorias(this.selectedCampeonatoId!);
        this.cargarPartidos();
      }
    });
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const user = this.authService.getCurrentUser();
        const rolesConLiga = ['directivo_liga', 'dirigente_equipo', 'tribuna_penas', 'tesoreria'];
        const rolNombre = user?.rol?.nombre ?? '';
        if (user && rolesConLiga.includes(rolNombre) && user.ligaId) {
          this.selectedLigaId = user.ligaId;
          this.loadCampeonatos(user.ligaId);
        }
      },
    });
  }

  loadCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => (this.campeonatos = data),
    });
  }

  loadCategorias(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => (this.categorias = data),
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.partidos = [];
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId);
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.selectedCategoriaId = null;
    this.partidos = [];
    if (this.selectedCampeonatoId) {
      this.loadCategorias(this.selectedCampeonatoId);
      this.cargarPartidos();
    }
  }

  onFiltroChange(): void {
    this.cargarPartidos();
  }

  cargarPartidos(): void {
    if (!this.selectedCampeonatoId) return;
    this.loading = true;
    this.errorMessage = '';

    this.partidosService
      .getByCampeonato(
        this.selectedCampeonatoId,
        this.selectedCategoriaId ?? undefined,
        this.selectedEtapa || undefined
      )
      .subscribe({
        next: (data) => {
          this.partidos = data;
          this.calcularEtapasYJornadas();
          const paginaMaxima = Math.max(1, Math.ceil(this.jornadasOrdenadas.length / this.jornadasPerPage));
          this.currentJornadaPage = this.paginaRetornoPendiente
            ? Math.min(this.paginaRetornoPendiente, paginaMaxima)
            : 1;
          this.paginaRetornoPendiente = null;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al cargar los partidos';
          this.loading = false;
        },
      });
  }

  calcularEtapasYJornadas(): void {
    this.etapas = [...new Set(this.partidos.map((p) => p.etapa))].sort();
    const filtrados = this.selectedEtapa
      ? this.partidos.filter((p) => p.etapa === this.selectedEtapa)
      : this.partidos;
    this.jornadas = [...new Set(filtrados.map((p) => p.jornada))].sort((a, b) => a - b);
  }

  get partidosFiltrados(): Partido[] {
    return this.partidos.filter((p) => {
      if (this.selectedEtapa && p.etapa !== this.selectedEtapa) return false;
      if (this.selectedJornada && p.jornada !== this.selectedJornada) return false;
      if (this.filtroRapidoEstado === 'pendientes' && !['programado', 'suspendido'].includes(p.estado)) return false;
      if (this.filtroRapidoEstado === 'en_juego' && p.estado !== 'en_juego') return false;
      if (this.filtroRapidoEstado === 'jugado' && p.estado !== 'jugado') return false;
      if (this.filtroRapidoEstado === 'suspendido' && p.estado !== 'suspendido') return false;
      return true;
    });
  }
  contarEstado(estado: 'pendientes' | 'en_juego' | 'jugado' | 'suspendido'): number { return this.partidos.filter(p => estado === 'pendientes' ? ['programado', 'suspendido'].includes(p.estado) : p.estado === estado).length; }
  seleccionarFiltroRapido(filtro: 'todos' | 'pendientes' | 'en_juego' | 'jugado' | 'suspendido'): void { this.filtroRapidoEstado = filtro; this.currentJornadaPage = 1; }

  get partidosPorJornada(): Map<number, Partido[]> {
    const mapa = new Map<number, Partido[]>();
    this.partidosFiltrados.forEach((p) => {
      const list = mapa.get(p.jornada) ?? [];
      list.push(p);
      mapa.set(p.jornada, list);
    });
    // Ordenar partidos dentro de cada jornada por fecha+hora de menor a mayor
    mapa.forEach((partidos, jornada) => {
      mapa.set(jornada, partidos.sort((a, b) => {
        const fechaA = a.fechaPartido ? `${a.fechaPartido}T${a.horaPartido ?? '00:00'}` : null;
        const fechaB = b.fechaPartido ? `${b.fechaPartido}T${b.horaPartido ?? '00:00'}` : null;
        if (fechaA && fechaB) return fechaA.localeCompare(fechaB);
        if (fechaA) return -1;
        if (fechaB) return 1;
        return 0;
      }));
    });
    return mapa;
  }

  get jornadasOrdenadas(): number[] {
    return [...this.partidosPorJornada.keys()].sort((a, b) => a - b);
  }

  // ── Paginación de jornadas ──
  get jornadasPaginadas(): number[] {
    const start = (this.currentJornadaPage - 1) * this.jornadasPerPage;
    return this.jornadasOrdenadas.slice(start, start + this.jornadasPerPage);
  }

  get totalJornadasPages(): number {
    return Math.ceil(this.jornadasOrdenadas.length / this.jornadasPerPage);
  }

  get totalJornadasPagesArray(): number[] {
    return Array.from({ length: this.totalJornadasPages }, (_, i) => i + 1);
  }

  onJornadaPageChange(page: number): void {
    if (page < 1 || page > this.totalJornadasPages) return;
    this.currentJornadaPage = page;
  }

  onJornadasPerPageChange(): void {
    this.currentJornadaPage = 1;
  }

  parametrosRetornoActa(): Record<string, string | number | null> {
    return {
      volverLigaId: this.selectedLigaId,
      volverCampeonatoId: this.selectedCampeonatoId,
      volverCategoriaId: this.selectedCategoriaId,
      volverEtapa: this.selectedEtapa || null,
      volverJornada: this.selectedJornada,
      volverEstado: this.filtroRapidoEstado === 'todos' ? null : this.filtroRapidoEstado,
      volverPagina: this.currentJornadaPage,
      volverJornadasPorPagina: this.jornadasPerPage,
    };
  }

  // ===== Resultado =====
  partidoEstaBloqueado(partido: Partido): boolean {
    return partido.estado === 'jugado' && !this.partidosDesbloqueados.has(partido.id);
  }

  desbloquearCorreccion(partido: Partido): void {
    const confirmar = window.confirm(
      'Este partido ya está finalizado. Corregirlo puede actualizar resultados, tablas, goleadores y sanciones. ¿Desea habilitar su corrección?',
    );
    if (confirmar) this.partidosDesbloqueados.add(partido.id);
  }

  bloquearCorreccion(partido: Partido): void {
    this.partidosDesbloqueados.delete(partido.id);
  }

  abrirModalResultado(partido: Partido): void {
    this.resultadoModal = { visible: true, partido };
    this.errorResultado = '';
    this.resultadoForm = {
      golesLocal: partido.golesLocal ?? 0,
      golesVisitante: partido.golesVisitante ?? 0,
      bonificacionLocal: partido.bonificacionLocal ?? 0,
      bonificacionVisitante: partido.bonificacionVisitante ?? 0,
      observaciones: partido.observaciones ?? '',
      sancionado: partido.sancionado ?? 'ninguno',
      resultadoAdministrativoPorExpulsion: partido.resultadoAdministrativoPorExpulsion ?? false,
    };
    // Resetear autores de goles
    this.autoresGoles = [];
    this.mostrarAutores = false;
    this.jugadoresLocal = [];
    this.jugadoresVisitante = [];
    // Cargar goles ya registrados para este partido
    this.goleadoresService.getGolesPorPartido(partido.id).subscribe({
      next: (goles) => {
        if (goles.length > 0) {
          this.autoresGoles = goles.map((g: any) => ({
            jugadorId: g.jugadorId,
            equipoDelJugadorId: g.equipoId,
            tipo: g.tipo ?? 'normal',
            minuto: g.minuto ?? undefined,
            cantidad: 1,
          }));
          this.mostrarAutores = true; // Expandir automáticamente si hay goles
        }
      },
    });
    // Cargar jugadores habilitados de cada equipo en esta categoría
    if (partido.equipoLocalId && partido.campeonatoId) {
      this.jugadorCampeonatosService
        .getByCampeonatoAndEquipo(partido.campeonatoId, partido.equipoLocalId)
        .subscribe({
          next: (data) =>
            (this.jugadoresLocal = data
              .filter((jc) => jc.estado === 'habilitado')
              // Incluimos numeroCancha para mostrarlo en el dropdown y ordenamos por él
              .map((jc) => ({
                id: jc.jugador?.id,
                nombre: jc.jugador?.nombre,
                cedula: jc.jugador?.cedula,
                equipoId: partido.equipoLocalId,
                numeroCancha: jc.numeroCancha,
              }))
              .sort((a, b) => (a.numeroCancha ?? 999) - (b.numeroCancha ?? 999))),
        });
    }
    if (partido.equipoVisitanteId && partido.campeonatoId) {
      this.jugadorCampeonatosService
        .getByCampeonatoAndEquipo(partido.campeonatoId, partido.equipoVisitanteId)
        .subscribe({
          next: (data) =>
            (this.jugadoresVisitante = data
              .filter((jc) => jc.estado === 'habilitado')
              // Incluimos numeroCancha para mostrarlo en el dropdown y ordenamos por él
              .map((jc) => ({
                id: jc.jugador?.id,
                nombre: jc.jugador?.nombre,
                cedula: jc.jugador?.cedula,
                equipoId: partido.equipoVisitanteId,
                numeroCancha: jc.numeroCancha,
              }))
              .sort((a, b) => (a.numeroCancha ?? 999) - (b.numeroCancha ?? 999))),
        });
    }
  }

  cerrarModalResultado(): void {
    this.resultadoModal = { visible: false, partido: null };
    this.errorResultado = '';
    this.autoresGoles = [];
    this.mostrarAutores = false;
    this.jugadoresLocal = [];
    this.jugadoresVisitante = [];
  }

  guardarResultado(): void {
    if (!this.resultadoModal.partido) return;
    this.errorResultado = '';
    this.errorMessage = '';

    if (this.hayDescuadreAutores) {
      this.errorResultado = this.mensajeDescuadreAutores;
      return;
    }

    this.savingResultado = true;
    // Expandir filas con cantidad > 1 en registros individuales antes de enviar
    const autoresExpandidos: AutorGolDto[] = [];
    for (const fila of this.autoresGoles) {
      const cant = Math.max(1, fila.cantidad ?? 1);
      for (let i = 0; i < cant; i++) {
        autoresExpandidos.push({
          jugadorId: fila.jugadorId,
          equipoDelJugadorId: fila.equipoDelJugadorId,
          tipo: fila.tipo,
          minuto: i === 0 ? fila.minuto : undefined,
        });
      }
    }
    const dto: RegistrarResultadoDto = {
      ...this.resultadoForm,
      resultadoAdministrativoPorExpulsion:
        this.resultadoForm.sancionado !== 'ninguno' && !!this.resultadoForm.resultadoAdministrativoPorExpulsion,
      autoresGoles: autoresExpandidos.length > 0 ? autoresExpandidos : undefined,
    };
    this.partidosService
      .registrarResultado(this.resultadoModal.partido.id, dto)
      .subscribe({
        next: (partidoActualizado) => {
          const idx = this.partidos.findIndex((p) => p.id === partidoActualizado.id);
          if (idx !== -1) this.partidos[idx] = partidoActualizado;
          this.errorMessage = '';
          this.successMessage = 'Resultado registrado correctamente.';
          this.cerrarModalResultado();
          this.savingResultado = false;
          setTimeout(() => (this.successMessage = ''), 4000);
        },
        error: (err) => {
          this.errorResultado = err?.error?.message || 'Error al registrar resultado';
          this.savingResultado = false;
        },
      });
  }

  // ===== Autores de goles =====

  agregarGol(equipoId: number): void {
    this.autoresGoles.push({ jugadorId: 0, equipoDelJugadorId: equipoId, tipo: 'normal', cantidad: 1 });
  }

  eliminarGol(index: number): void {
    this.autoresGoles.splice(index, 1);
  }

  /**
   * Solo se comprueban los autores cuando el usuario decidió registrarlos.
   * Los autogoles suman al rival, igual que en la validación del backend.
   */
  get hayDescuadreAutores(): boolean {
    if (!this.mostrarAutores || !this.resultadoModal.partido) return false;

    const { local, visitante } = this.contarAutoresPorMarcador();
    return local !== Number(this.resultadoForm.golesLocal ?? 0)
      || visitante !== Number(this.resultadoForm.golesVisitante ?? 0);
  }

  get mensajeDescuadreAutores(): string {
    const { local, visitante } = this.contarAutoresPorMarcador();
    return `La suma de autores no coincide con el marcador. Marcador: ${this.resultadoForm.golesLocal ?? 0}-${this.resultadoForm.golesVisitante ?? 0}. Autores: local=${local}, visitante=${visitante}.`;
  }

  private contarAutoresPorMarcador(): { local: number; visitante: number } {
    const partido = this.resultadoModal.partido;
    if (!partido) return { local: 0, visitante: 0 };

    return this.autoresGoles.reduce(
      (totales, gol) => {
        const cantidad = Math.max(0, Number(gol.cantidad) || 0);
        const beneficiaLocal = (gol.tipo !== 'autogol' && gol.equipoDelJugadorId === partido.equipoLocalId)
          || (gol.tipo === 'autogol' && gol.equipoDelJugadorId === partido.equipoVisitanteId);
        if (beneficiaLocal) totales.local += cantidad;
        else totales.visitante += cantidad;
        return totales;
      },
      { local: 0, visitante: 0 },
    );
  }

  /** Jugadores del equipo para un gol en el array autoresGoles */
  getJugadoresPorEquipo(equipoId: number): any[] {
    if (equipoId === this.resultadoModal.partido?.equipoLocalId) return this.jugadoresLocal;
    if (equipoId === this.resultadoModal.partido?.equipoVisitanteId) return this.jugadoresVisitante;
    return [];
  }

  opcionesJugadoresPorEquipo(equipoId: number): SearchableSelectOption[] {
    return this.getJugadoresPorEquipo(equipoId).map(jugador => ({
      value: jugador.id,
      label: `${jugador.numeroCancha != null ? `#${jugador.numeroCancha} - ` : ''}${jugador.nombre}`,
      secondary: jugador.cedula ? `Cédula: ${jugador.cedula}` : undefined,
      searchText: `${jugador.nombre ?? ''} ${jugador.cedula ?? ''} ${jugador.numeroCancha ?? ''}`,
    }));
  }

  // ===== Eliminar fixture =====
  eliminarFixture(): void {
    if (!this.selectedCampeonatoId || !this.selectedCategoriaId || !this.selectedEtapa) {
      this.errorMessage = 'Selecciona campeonato, categoría y etapa para eliminar el fixture.';
      return;
    }
    if (!confirm(`¿Eliminar todos los partidos de la etapa "${this.selectedEtapa}"? Esta acción no se puede deshacer.`)) return;

    this.partidosService
      .eliminarFixture(this.selectedCampeonatoId, this.selectedCategoriaId, this.selectedEtapa)
      .subscribe({
        next: (res) => {
          this.successMessage = `Se eliminaron ${res.eliminados} partidos.`;
          this.cargarPartidos();
        },
        error: (err) => (this.errorMessage = err?.error?.message || 'Error al eliminar el fixture'),
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      programado: 'bg-secondary',
      jugado: 'bg-success',
      suspendido: 'bg-warning text-dark',
      cancelado: 'bg-danger',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  logout(): void {
    this.authService.logout();
  }
}
