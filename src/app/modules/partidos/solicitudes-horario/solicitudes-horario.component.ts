import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { Partido, SolicitudHorario } from '../partido.model';
import { PartidosService } from '../partidos.service';
import { SolicitudHorarioPdfService } from './solicitud-horario-pdf.service';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-solicitudes-horario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MainNavComponent, SearchableSelectComponent],
  templateUrl: './solicitudes-horario.component.html',
  styleUrls: ['./solicitudes-horario.component.scss'],
})
export class SolicitudesHorarioComponent implements OnInit {
  user$: Observable<any>;
  esMaster = false;
  esDirigente = false;
  puedeResolver = false;
  equipoUsuarioId: number | null = null;

  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  partidos: Partido[] = [];
  solicitudes: SolicitudHorario[] = [];
  etapas: string[] = [];

  ligaId: number | null = null;
  campeonatoId: number | null = null;
  categoriaId: number | null = null;
  etapa = '';
  estadoFiltro: SolicitudHorario['estado'] | '' = '';

  partidoId: number | null = null;
  equipoId: number | null = null;
  fechaSolicitada = '';
  horaSolicitada = '';
  canchaSolicitada = '';
  motivo = '';

  cargando = false;
  guardando = false;
  procesandoId: number | null = null;
  error = '';
  exito = '';

  constructor(
    private readonly authService: AuthService,
    private readonly ligasService: LigasService,
    private readonly campeonatosService: CampeonatosService,
    private readonly categoriasService: CategoriasService,
    private readonly partidosService: PartidosService,
    private readonly solicitudPdf: SolicitudHorarioPdfService,
  ) {
    this.user$ = authService.currentUser$;
  }

  ngOnInit(): void {
    const usuario = this.authService.currentUserValue as any;
    this.esMaster = usuario?.rol?.nombre === 'master';
    this.esDirigente = usuario?.rol?.nombre === 'dirigente_equipo';
    this.puedeResolver = ['master', 'directivo_liga'].includes(usuario?.rol?.nombre);
    this.equipoUsuarioId = usuario?.equipoId ?? null;
    this.ligasService.getAll().subscribe(ligas => this.ligas = ligas);
    if (!this.esMaster && usuario?.ligaId) {
      this.ligaId = usuario.ligaId;
      this.cambiarLiga();
    }
  }

  cambiarLiga(): void {
    this.campeonatos = [];
    this.campeonatoId = null;
    this.limpiarSeleccion();
    if (this.ligaId) this.campeonatosService.getByLiga(this.ligaId).subscribe(items => this.campeonatos = items);
  }

  cambiarCampeonato(): void {
    this.categorias = [];
    this.categoriaId = null;
    this.limpiarSeleccion(false);
    if (!this.campeonatoId) return;
    this.categoriasService.getByCampeonato(this.campeonatoId).subscribe(items => this.categorias = items);
    this.cargarSolicitudes();
  }

  cambiarCategoria(): void {
    this.etapa = '';
    this.partidos = [];
    this.etapas = [];
    this.partidoId = null;
    this.equipoId = this.esDirigente ? this.equipoUsuarioId : null;
    if (!this.campeonatoId || !this.categoriaId) {
      this.cargarSolicitudes();
      return;
    }
    this.partidosService.getByCampeonato(this.campeonatoId, this.categoriaId).subscribe({
      next: partidos => {
        this.partidos = partidos.filter(partido => partido.estado === 'programado' && (!partido.fechaPartido || !partido.horaPartido));
        this.etapas = [...new Set(this.partidos.map(partido => partido.etapa))];
        this.cargarSolicitudes();
      },
      error: e => this.error = e?.error?.message ?? 'No se pudieron cargar los partidos disponibles.',
    });
  }

  cambiarEtapa(): void {
    this.partidoId = null;
    this.equipoId = this.esDirigente ? this.equipoUsuarioId : null;
    this.cargarSolicitudes();
  }

  seleccionarPartido(): void {
    if (this.esDirigente) this.equipoId = this.equipoUsuarioId;
    else this.equipoId = null;
    const partido = this.partidoSeleccionado;
    if (partido?.cancha) this.canchaSolicitada = partido.cancha;
  }

  guardar(): void {
    this.error = '';
    this.exito = '';
    if (!this.campeonatoId || !this.categoriaId || !this.etapa || !this.partidoId || !this.equipoId || !this.fechaSolicitada || !this.horaSolicitada || !this.motivo.trim()) {
      this.error = 'Completa campeonato, categoría, etapa, partido, equipo, fecha, hora y motivo.';
      return;
    }
    this.guardando = true;
    this.partidosService.crearSolicitudHorario({
      campeonatoId: this.campeonatoId,
      categoriaId: this.categoriaId,
      etapa: this.etapa,
      partidoId: this.partidoId,
      equipoId: this.equipoId,
      fechaSolicitada: this.fechaSolicitada,
      horaSolicitada: this.horaSolicitada,
      canchaSolicitada: this.canchaSolicitada.trim() || undefined,
      motivo: this.motivo.trim(),
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.exito = 'Solicitud registrada. Quedó pendiente de revisión por el directivo.';
        this.partidoId = null;
        this.equipoId = this.esDirigente ? this.equipoUsuarioId : null;
        this.fechaSolicitada = '';
        this.horaSolicitada = '';
        this.canchaSolicitada = '';
        this.motivo = '';
        this.cargarSolicitudes();
      },
      error: e => {
        this.guardando = false;
        this.error = e?.error?.message ?? 'No se pudo registrar la solicitud.';
      },
    });
  }

  resolver(solicitud: SolicitudHorario, decision: 'aprobar' | 'rechazar' | 'cancelar'): void {
    let observacion: string | undefined;
    if (decision !== 'aprobar') {
      const valor = window.prompt(decision === 'rechazar' ? 'Motivo del rechazo:' : 'Motivo de la cancelación:');
      if (valor === null) return;
      observacion = valor.trim();
      if (!observacion) {
        this.error = 'Debes indicar el motivo.';
        return;
      }
    } else if (!window.confirm('¿Aprobar esta solicitud reglamentaria de horario?')) {
      return;
    }
    this.procesandoId = solicitud.id;
    this.error = '';
    this.partidosService.resolverSolicitudHorario(solicitud.id, decision, observacion).subscribe({
      next: () => {
        this.procesandoId = null;
        this.exito = decision === 'aprobar' ? 'Solicitud aprobada y disponible para la programación semanal.' : 'Solicitud actualizada.';
        this.cargarSolicitudes();
      },
      error: e => {
        this.procesandoId = null;
        this.error = e?.error?.message ?? 'No se pudo resolver la solicitud.';
      },
    });
  }

  async descargarSolicitud(solicitud: SolicitudHorario): Promise<void> {
    this.error = '';
    const liga = this.ligas.find(item => item.id === solicitud.ligaId);
    const campeonato = this.campeonatos.find(item => item.id === solicitud.campeonatoId);
    const categoria = this.categorias.find(item => item.id === solicitud.categoriaId);
    try {
      await this.solicitudPdf.descargar({
        solicitud,
        liga: liga?.nombre ?? 'Liga Barrial',
        ligaImagen: liga?.imagen,
        campeonato: campeonato?.nombre ?? solicitud.partido?.campeonato?.nombre ?? 'Campeonato',
        categoria: categoria?.nombre ?? solicitud.partido?.categoria?.nombre ?? 'Categoría',
      });
    } catch {
      this.error = 'No se pudo generar el PDF de la solicitud.';
    }
  }

  cargarSolicitudes(): void {
    if (!this.campeonatoId) {
      this.solicitudes = [];
      return;
    }
    this.cargando = true;
    this.partidosService.listarSolicitudesHorario(
      this.campeonatoId,
      this.categoriaId ?? undefined,
      this.etapa || undefined,
      this.estadoFiltro,
    ).subscribe({
      next: items => {
        this.solicitudes = items;
        this.cargando = false;
      },
      error: e => {
        this.cargando = false;
        this.error = e?.error?.message ?? 'No se pudieron cargar las solicitudes.';
      },
    });
  }

  get partidosDisponibles(): Partido[] {
    return this.partidos.filter(partido => !this.etapa || partido.etapa === this.etapa);
  }

  get partidosSearchOptions(): SearchableSelectOption[] {
    return this.partidosDisponibles.map(partido => ({
      value: partido.id,
      label: this.textoPartido(partido),
      secondary: partido.cancha || undefined,
      searchText: `${partido.equipoLocal?.nombre ?? ''} ${partido.equipoVisitante?.nombre ?? ''} jornada ${partido.jornada ?? ''}`,
    }));
  }

  get partidoSeleccionado(): Partido | undefined {
    return this.partidos.find(partido => partido.id === this.partidoId);
  }

  get equiposDelPartido(): any[] {
    const partido = this.partidoSeleccionado;
    if (!partido) return [];
    return [partido.equipoLocal, partido.equipoVisitante].filter(Boolean);
  }

  textoPartido(partido?: Partido): string {
    if (!partido) return 'Partido';
    return `${partido.equipoLocal?.nombre ?? 'Local'} vs ${partido.equipoVisitante?.nombre ?? 'Visitante'} · Jornada ${partido.jornada}`;
  }

  nombreEtapa(etapa: string): string {
    return etapa.replace(/_/g, ' ');
  }

  logout(): void {
    this.authService.logout();
  }

  private limpiarSeleccion(limpiarCampeonato = true): void {
    if (limpiarCampeonato) this.campeonatoId = null;
    this.categorias = [];
    this.categoriaId = null;
    this.etapa = '';
    this.partidos = [];
    this.etapas = [];
    this.solicitudes = [];
    this.partidoId = null;
    this.equipoId = this.esDirigente ? this.equipoUsuarioId : null;
  }
}
