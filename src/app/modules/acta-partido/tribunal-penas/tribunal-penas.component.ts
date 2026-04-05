import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActaPartidoService } from '../acta-partido.service';
import { SancionesService } from '../../sanciones/sanciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Observable } from 'rxjs';
import {
  ActaIncidencia,
  ResolverIncidenciaDto,
  TIPO_INCIDENCIA_LABELS,
} from '../acta-partido.model';
import { TipoSancion } from '../../sanciones/sancion.model';
import { environment } from '../../../../environments/environment';

/**
 * Tribunal de Penas
 *
 * El tribunal revisa todas las incidencias disciplinarias pendientes
 * de un campeonato (registradas por los vocales en las actas) y decide:
 *
 *   - Sancionar  → ingresa tipo de sanción + partidos de suspensión → el sistema
 *                  crea la Sancion automáticamente en el módulo de sanciones.
 *   - Absolver   → la incidencia se cierra sin sanción.
 *
 * La automatización de "partidos cumplidos" se ejecuta sola cuando se
 * registran resultados de partidos (ya implementado en PartidosService).
 */
@Component({
  selector: 'app-tribunal-penas',
  standalone: true,
  imports: [CommonModule, FormsModule, MainNavComponent],
  templateUrl: './tribunal-penas.component.html',
  styleUrls: ['./tribunal-penas.component.scss'],
})
export class TribunalPenasComponent implements OnInit {

  // ── Filtros ────────────────────────────────────────────────────────────────
  ligas: any[] = [];
  ligaIdSeleccionada: number | null = null;
  campeonatos: any[] = [];
  campeonatoIdSeleccionado: number | null = null;
  categorias: any[] = [];
  etapas: string[] = [];
  jornadas: number[] = [];
  selectedCategoriaId: number | null = null;
  selectedEtapa = '';
  selectedJornada: number | null = null;

  // ── Datos ──────────────────────────────────────────────────────────────────
  incidencias: ActaIncidencia[] = [];
  tiposSancion: TipoSancion[] = [];
  reglas: any[] = [];
  loading = false;
  error   = '';

  // ── Panel de resolución ────────────────────────────────────────────────────
  incidenciaAbierta: ActaIncidencia | null = null;
  form: ResolverIncidenciaDto = { decision: 'sancionar' };
  resolviendo = false;
  errorResolucion = '';
  mensajeOk = '';

  readonly tipoLabels = TIPO_INCIDENCIA_LABELS;
  user$: Observable<any>;

  constructor(
    private actaService: ActaPartidoService,
    private sancionesService: SancionesService,
    private authService: AuthService,
    private permissions: PermissionsService,
    private ligasService: LigasService,
    private categoriasService: CategoriasService,
    private http: HttpClient,
  ) {
    this.user$ = this.authService.currentUser$;
  }

  get isMaster(): boolean {
    return this.permissions.isMaster();
  }

  // Liga efectiva: para master es la seleccionada, para el resto es la propia
  get ligaIdEfectivo(): number | null {
    if (this.isMaster) return this.ligaIdSeleccionada;
    return (this.authService.currentUserValue as any)?.ligaId ?? null;
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    if (this.isMaster) {
      this.ligasService.getAll().subscribe({ next: (l) => (this.ligas = l) });
    } else {
      this.authService.currentUser$.subscribe((user) => {
        if (!user) return;
        const ligaId = user.ligaId;
        if (ligaId) {
          this.cargarCampeonatos(ligaId);
          this.cargarTiposSancion(ligaId);
        }
      });
    }
  }

  onLigaChange(): void {
    this.campeonatoIdSeleccionado = null;
    this.campeonatos = [];
    this.tiposSancion = [];
    this.incidencias = [];
    this.categorias = [];
    this.etapas = [];
    this.jornadas = [];
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    this.selectedJornada = null;
    if (!this.ligaIdSeleccionada) return;
    this.cargarCampeonatos(this.ligaIdSeleccionada);
    this.cargarTiposSancion(this.ligaIdSeleccionada);
  }

  private cargarCampeonatos(ligaId: number): void {
    this.http
      .get<any[]>(`${environment.apiUrl}/campeonatos/liga/${ligaId}`)
      .subscribe({
        next: (list) => { this.campeonatos = list; },
        error: () => {},
      });
  }

  private cargarTiposSancion(ligaId: number): void {
    this.sancionesService.getTiposSancion(ligaId).subscribe({
      next: (tipos) => { this.tiposSancion = tipos.filter((t) => t.activo); },
      error: () => {},
    });
  }

  onCampeonatoChange(): void {
    this.incidencias = [];
    this.categorias = [];
    this.etapas = [];
    this.jornadas = [];
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    this.selectedJornada = null;
    if (!this.campeonatoIdSeleccionado) return;
    this.cargarIncidencias();
    this.cargarCategorias(this.campeonatoIdSeleccionado);
  }

  onFiltroChange(): void { /* filtrado client-side mediante getters */ }

  cargarIncidencias(): void {
    if (!this.campeonatoIdSeleccionado) return;
    this.loading    = true;
    this.error      = '';
    this.incidencias = [];

    this.actaService.listarIncidenciasPendientes(this.campeonatoIdSeleccionado).subscribe({
      next: (list) => {
        this.incidencias = list;
        this.derivarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error   = err?.error?.message ?? 'Error al cargar las incidencias';
        this.loading = false;
      },
    });
  }

  private cargarCategorias(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (cats) => (this.categorias = cats),
      error: () => {},
    });
  }

  private derivarFiltros(): void {
    this.etapas = [...new Set(
      this.incidencias.map(i => i.partido?.etapa).filter((e): e is string => !!e)
    )].sort();
    this.jornadas = [...new Set(
      this.incidencias.map(i => i.partido?.jornada).filter((j): j is number => j != null)
    )].sort((a, b) => a - b);
  }

  get incidenciasFiltradas(): ActaIncidencia[] {
    return this.incidencias.filter(i => {
      if (this.selectedCategoriaId && i.categoriaId !== this.selectedCategoriaId) return false;
      if (this.selectedEtapa && i.partido?.etapa !== this.selectedEtapa) return false;
      if (this.selectedJornada && i.partido?.jornada !== this.selectedJornada) return false;
      return true;
    });
  }

  get incidenciasAgrupadasPorPartido(): { partido: any; incidencias: ActaIncidencia[] }[] {
    const mapa = new Map<number, { partido: any; incidencias: ActaIncidencia[] }>();
    for (const inc of this.incidenciasFiltradas) {
      if (!mapa.has(inc.partidoId)) {
        mapa.set(inc.partidoId, { partido: inc.partido, incidencias: [] });
      }
      mapa.get(inc.partidoId)!.incidencias.push(inc);
    }
    return [...mapa.values()];
  }

  // ── Panel de resolución ────────────────────────────────────────────────────

  abrirResolucion(inc: ActaIncidencia): void {
    this.incidenciaAbierta = inc;
    this.reglas = [];
    this.form = {
      decision:             'sancionar',
      tipoSancionId:        undefined,
      reglaSancionId:       undefined,
      partidosSuspension:   1,
      fechaInicioSuspension: undefined,
      fechaFinSuspension:   undefined,
      descripcion:          '',
      observacionesTribunal:'',
      fechaSancion:         new Date().toLocaleDateString('en-CA'),
    };
    this.errorResolucion = '';
    this.mensajeOk       = '';
  }

  onTipoSancionChange(): void {
    this.reglas = [];
    this.form.reglaSancionId = undefined;
    if (!this.form.tipoSancionId) return;
    const ligaId = (this.authService.currentUserValue as any)?.ligaId;
    this.sancionesService.getReglas(ligaId, this.campeonatoIdSeleccionado ?? undefined).subscribe({
      next: (todas) => {
        // Filtrar solo las reglas del tipo de sanción seleccionado
        this.reglas = todas.filter(
          (r) => r.tipoSancionId === Number(this.form.tipoSancionId),
        );
      },
      error: () => {},
    });
  }

  onReglaSancionChange(): void {
    if (!this.form.reglaSancionId) return;
    const regla = this.reglas.find((r) => r.id === Number(this.form.reglaSancionId));
    if (regla?.modoCastigo === 'tiempo' && regla.duracionMeses) {
      const fechaInicio = this.form.fechaSancion || new Date().toLocaleDateString('en-CA');
      const inicio = new Date(fechaInicio);
      const fin = new Date(inicio);
      fin.setMonth(fin.getMonth() + regla.duracionMeses);
      this.form.fechaInicioSuspension = inicio.toISOString().split('T')[0];
      this.form.fechaFinSuspension    = fin.toISOString().split('T')[0];
      this.form.partidosSuspension    = 0;
    } else if (regla?.partidosSuspension != null) {
      this.form.partidosSuspension    = regla.partidosSuspension;
      this.form.fechaInicioSuspension = undefined;
      this.form.fechaFinSuspension    = undefined;
    }
  }

  cerrarPanel(): void {
    this.incidenciaAbierta = null;
  }

  /** True si la regla seleccionada aplica castigo por tiempo. */
  get esPorTiempo(): boolean {
    if (!this.form.reglaSancionId) return false;
    const regla = this.reglas.find((r) => r.id === Number(this.form.reglaSancionId));
    return regla?.modoCastigo === 'tiempo';
  }

  resolver(): void {
    if (!this.incidenciaAbierta) return;

    if (this.form.decision === 'sancionar' && !this.form.tipoSancionId) {
      this.errorResolucion = 'Debes seleccionar el tipo de sanción.';
      return;
    }

    this.resolviendo     = true;
    this.errorResolucion = '';

    const dto: ResolverIncidenciaDto = {
      decision:              this.form.decision,
      tipoSancionId:         this.form.decision === 'sancionar' ? this.form.tipoSancionId   : undefined,
      reglaSancionId:        this.form.decision === 'sancionar' ? this.form.reglaSancionId  : undefined,
      partidosSuspension:    this.form.decision === 'sancionar' && !this.esPorTiempo ? (this.form.partidosSuspension ?? 0) : undefined,
      fechaInicioSuspension: this.form.decision === 'sancionar' && this.esPorTiempo ? this.form.fechaInicioSuspension : undefined,
      fechaFinSuspension:    this.form.decision === 'sancionar' && this.esPorTiempo ? this.form.fechaFinSuspension    : undefined,
      descripcion:           this.form.descripcion              || undefined,
      observacionesTribunal: this.form.observacionesTribunal    || undefined,
      fechaSancion:          this.form.fechaSancion             || undefined,
    };

    this.actaService.resolverIncidencia(this.incidenciaAbierta.id!, dto).subscribe({
      next: () => {
        this.resolviendo = false;
        this.mensajeOk   = this.form.decision === 'sancionar'
          ? '✅ Sanción aplicada correctamente.'
          : '✅ Incidencia absuelta.';

        // Quitar la incidencia de la lista local
        this.incidencias = this.incidencias.filter(
          (i) => i.id !== this.incidenciaAbierta!.id,
        );
        this.incidenciaAbierta = null;
        setTimeout(() => (this.mensajeOk = ''), 4000);
      },
      error: (err) => {
        this.resolviendo     = false;
        this.errorResolucion = err?.error?.message ?? 'Error al resolver la incidencia';
      },
    });
  }
}
