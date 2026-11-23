import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { ReportesExportService } from '../reportes-export.service';
import { ReporteEquipo, ReporteJugador, ReporteJugadorOpcion } from '../reportes.model';
import { ReportesService } from '../reportes.service';

@Component({
  selector: 'app-reportes-entidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent, SearchableSelectComponent],
  templateUrl: './reportes-entidad.component.html',
  styleUrls: ['./reportes-entidad.component.scss'],
})
export class ReportesEntidadComponent implements OnInit {
  tipo: 'equipo' | 'jugador' = 'equipo';
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  equipos: any[] = [];
  jugadoresDisponibles: ReporteJugadorOpcion[] = [];
  opcionesEtapas: string[] = [];
  ligaId: number | null = null;
  campeonatoId: number | null = null;
  categoriaId: number | null = null;
  equipoId: number | null = null;
  jugadorId: number | null = null;
  etapa = '';
  reporteEquipo: ReporteEquipo | null = null;
  reporteJugador: ReporteJugador | null = null;
  loading = false;
  exportando = false;
  errorMessage = '';
  private consultaId = 0;

  user$ = this.authService.currentUser$;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly ligasService: LigasService,
    private readonly campeonatosService: CampeonatosService,
    private readonly categoriasService: CategoriasService,
    private readonly equiposService: EquiposService,
    private readonly reportesService: ReportesService,
    private readonly exportService: ReportesExportService,
  ) {}

  ngOnInit(): void {
    this.tipo = this.route.snapshot.data['tipo'] === 'jugador' ? 'jugador' : 'equipo';
    this.cargarLigas();
  }

  get esMaster(): boolean {
    return this.authService.getCurrentUser()?.rol?.nombre === 'master';
  }

  get esDirigente(): boolean {
    return this.authService.getCurrentUser()?.rol?.nombre === 'dirigente_equipo';
  }

  get reporte(): ReporteEquipo | ReporteJugador | null {
    return this.tipo === 'equipo' ? this.reporteEquipo : this.reporteJugador;
  }

  get etapas(): string[] {
    return this.opcionesEtapas.length ? this.opcionesEtapas : (this.reporte?.opciones.etapas ?? []);
  }

  get opcionesEquipos(): SearchableSelectOption[] {
    return this.equipos.map((equipo) => ({
      value: equipo.id,
      label: equipo.nombre,
      secondary: equipo.representante || undefined,
    }));
  }

  get opcionesJugadores(): SearchableSelectOption[] {
    return this.jugadoresDisponibles
      .map((jugador) => {
        const detalle = [
          jugador.cedula ? `C.I. ${jugador.cedula}` : '',
          jugador.equipoActualNombre
            && jugador.equipoActualNombre !== jugador.equipoPeriodoNombre
            ? `Actual: ${jugador.equipoActualNombre}`
            : '',
        ].filter(Boolean).join(' · ');
        return {
          value: jugador.jugadorId,
          label: jugador.jugadorNombre,
          secondary: detalle || undefined,
          searchText: `${jugador.cedula || ''} ${jugador.equipoActualNombre || ''}`,
        };
      });
  }

  cargarLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (ligas) => {
        this.ligas = ligas.filter((liga: any) => liga.activo !== false);
        const usuario = this.authService.getCurrentUser();
        if (!this.esMaster && usuario?.ligaId) {
          this.ligaId = usuario.ligaId;
          this.cargarDependenciasLiga(usuario.ligaId);
        }
      },
      error: () => this.errorMessage = 'No se pudieron cargar las ligas.',
    });
  }

  onLigaChange(): void {
    this.reiniciarDesdeLiga();
    if (this.ligaId) this.cargarDependenciasLiga(this.ligaId);
  }

  private cargarDependenciasLiga(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (items) => this.campeonatos = items.filter((item: any) => item.activo !== false),
      error: () => this.errorMessage = 'No se pudieron cargar los campeonatos.',
    });
    this.equiposService.getByLiga(ligaId).subscribe({
      next: (items) => {
        this.equipos = items.filter((item: any) => item.activo !== false);
        const equipoUsuario = this.authService.getCurrentUser()?.equipoId;
        if (this.esDirigente && equipoUsuario) this.equipoId = equipoUsuario;
      },
      error: () => this.errorMessage = 'No se pudieron cargar los equipos.',
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.categoriaId = null;
    this.etapa = '';
    this.jugadorId = null;
    this.jugadoresDisponibles = [];
    this.opcionesEtapas = [];
    this.limpiarReporte();
    if (!this.campeonatoId) return;
    this.categoriasService.getByCampeonato(this.campeonatoId).subscribe({
      next: (items) => this.categorias = items.filter((item: any) => item.activo !== false),
      error: () => this.errorMessage = 'No se pudieron cargar las categorias.',
    });
    if (this.tipo === 'jugador' && this.equipoId) this.cargarJugadores();
    if (this.tipo === 'equipo' && this.equipoId) this.consultar();
  }

  onCategoriaChange(): void {
    this.etapa = '';
    this.jugadorId = null;
    this.opcionesEtapas = [];
    this.limpiarReporte();
    if (this.tipo === 'jugador') this.cargarJugadores();
    else this.consultar();
  }

  onEquipoChange(): void {
    this.jugadorId = null;
    this.jugadoresDisponibles = [];
    this.opcionesEtapas = [];
    this.etapa = '';
    this.limpiarReporte();
    if (this.tipo === 'jugador') this.cargarJugadores();
    else this.consultar();
  }

  onJugadorChange(): void {
    this.limpiarReporte();
    this.consultar();
  }

  onEtapaChange(): void {
    this.limpiarReporte();
    if (this.tipo === 'jugador') {
      this.jugadorId = null;
      this.cargarJugadores();
    } else {
      this.consultar();
    }
  }

  cargarJugadores(): void {
    if (!this.campeonatoId || !this.equipoId) return;
    this.reportesService.obtenerOpcionesJugadores({
      campeonatoId: this.campeonatoId,
      equipoId: this.equipoId,
      categoriaId: this.categoriaId,
      etapa: this.etapa || undefined,
    }).subscribe({
      next: (respuesta) => {
        this.opcionesEtapas = respuesta.etapas;
        this.jugadoresDisponibles = respuesta.jugadores;
      },
      error: (error) => {
        this.jugadoresDisponibles = [];
        this.errorMessage = error?.error?.message ?? 'No se pudieron cargar los jugadores del equipo y periodo.';
      },
    });
  }

  consultar(): void {
    if (!this.campeonatoId || !this.equipoId) return;
    if (this.tipo === 'jugador' && !this.jugadorId) return;
    this.loading = true;
    this.errorMessage = '';
    const id = ++this.consultaId;
    const filtros = {
      campeonatoId: this.campeonatoId,
      categoriaId: this.categoriaId,
      etapa: this.etapa || undefined,
      equipoId: this.equipoId,
      jugadorId: this.jugadorId ?? undefined,
    };
    const consulta: Observable<ReporteEquipo | ReporteJugador> = this.tipo === 'equipo'
      ? this.reportesService.obtenerEquipo(filtros)
      : this.reportesService.obtenerJugador(filtros);
    consulta.subscribe({
      next: (reporte: any) => {
        if (id !== this.consultaId) return;
        if (this.tipo === 'equipo') this.reporteEquipo = reporte;
        else this.reporteJugador = reporte;
        this.opcionesEtapas = reporte.opciones.etapas;
        if (this.etapa && !reporte.opciones.etapas.includes(this.etapa)) this.etapa = '';
        this.loading = false;
      },
      error: (error: any) => {
        if (id !== this.consultaId) return;
        this.errorMessage = error?.error?.message ?? 'No se pudo generar el reporte.';
        this.loading = false;
      },
    });
  }

  async descargarPdf(): Promise<void> {
    if (!this.reporte) return;
    this.exportando = true;
    try {
      if (this.tipo === 'equipo') await this.exportService.descargarPdfEquipo(this.reporteEquipo!);
      else await this.exportService.descargarPdfJugador(this.reporteJugador!);
    } catch {
      this.errorMessage = 'No se pudo generar el PDF del reporte.';
    } finally { this.exportando = false; }
  }

  descargarExcel(): void {
    if (!this.reporte) return;
    this.exportando = true;
    try {
      if (this.tipo === 'equipo') this.exportService.descargarExcelEquipo(this.reporteEquipo!);
      else this.exportService.descargarExcelJugador(this.reporteJugador!);
    } finally { this.exportando = false; }
  }

  nombreEtapa(valor: string | null): string {
    return valor ? valor.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase()) : 'Todas las etapas';
  }

  iniciales(nombre: string): string {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase() || '?';
  }

  estadoParticipacion(estado: string): string {
    const etiquetas: Record<string, string> = {
      jugo: 'Jugó',
      no_jugo: 'No jugó',
      suspendido: 'Suspendido',
      ausente: 'Ausente',
      lesionado: 'Lesionado',
      expulsado: 'Jugó y fue expulsado',
      sin_registro: 'Sin planilla',
    };
    return etiquetas[estado] ?? estado;
  }

  private reiniciarDesdeLiga(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.equipos = [];
    this.jugadoresDisponibles = [];
    this.opcionesEtapas = [];
    this.campeonatoId = null;
    this.categoriaId = null;
    this.equipoId = null;
    this.jugadorId = null;
    this.etapa = '';
    this.limpiarReporte();
  }

  private limpiarReporte(): void {
    this.reporteEquipo = null;
    this.reporteJugador = null;
  }

  logout(): void { this.authService.logout(); }
}
