import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { SancionesService } from '../sanciones.service';
import { Sancion, FiltrosSanciones, TipoSancion } from '../sancion.model';
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
  campeonatos: any[] = [];
  ligas: any[] = [];

  user$: Observable<any>;
  filtros: FiltrosSanciones = {};
  filtroCampeonatoId: number | null = null;
  filtroTipoId: number | null = null;
  filtroLigaId: number | null = null;
  soloActivas = false;

  // Filtros client-side
  busqueda = '';
  filtroEquipoId: number | null = null;

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

    this.sancionesService.getSanciones(filtros).subscribe({
      next: (s) => {
        this.sanciones = s;
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
    this.busqueda = '';
    this.filtroEquipoId = null;
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

  sancionadoLabel(s: Sancion): string {
    if (s.jugador) return `${s.jugador.nombre}`;
    if (s.equipo) return s.equipo.nombre;
    return '—';
  }
}
