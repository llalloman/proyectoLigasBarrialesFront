import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActaPartidoService } from '../acta-partido.service';
import { SancionesService } from '../../sanciones/sanciones.service';
import { AuthService } from '../../../core/services/auth.service';
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
  campeonatos: any[] = [];
  campeonatoIdSeleccionado: number | null = null;

  // ── Datos ──────────────────────────────────────────────────────────────────
  incidencias: ActaIncidencia[] = [];
  tiposSancion: TipoSancion[] = [];
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
    private http: HttpClient,
  ) {
    this.user$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (!user) return;
      const ligaId = user.ligaId;
      if (ligaId) {
        this.cargarCampeonatos(ligaId);
        this.cargarTiposSancion(ligaId);
      }
    });
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

  cargarIncidencias(): void {
    if (!this.campeonatoIdSeleccionado) return;
    this.loading    = true;
    this.error      = '';
    this.incidencias = [];

    this.actaService.listarIncidenciasPendientes(this.campeonatoIdSeleccionado).subscribe({
      next: (list) => {
        this.incidencias = list;
        this.loading = false;
      },
      error: (err) => {
        this.error   = err?.error?.message ?? 'Error al cargar las incidencias';
        this.loading = false;
      },
    });
  }

  // ── Panel de resolución ────────────────────────────────────────────────────

  abrirResolucion(inc: ActaIncidencia): void {
    this.incidenciaAbierta = inc;
    this.form = {
      decision:             'sancionar',
      tipoSancionId:        undefined,
      reglaSancionId:       undefined,
      partidosSuspension:   1,
      descripcion:          '',
      observacionesTribunal:'',
      fechaSancion:         new Date().toISOString().split('T')[0],
    };
    this.errorResolucion = '';
    this.mensajeOk       = '';
  }

  cerrarPanel(): void {
    this.incidenciaAbierta = null;
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
      partidosSuspension:    this.form.decision === 'sancionar' ? (this.form.partidosSuspension ?? 0) : undefined,
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
