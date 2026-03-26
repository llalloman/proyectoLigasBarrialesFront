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

  user$: Observable<any>;
  filtros: FiltrosSanciones = {};
  filtroCampeonatoId: number | null = null;
  filtroTipoId: number | null = null;
  soloActivas = false;

  cargando = false;
  error = '';
  exito = '';

  get ligaId(): number {
    return (this.authService.currentUserValue as any)?.ligaId;
  }

  constructor(
    private readonly sancionesService: SancionesService,
    private readonly campeonatosService: CampeonatosService,
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
    this.cargarTipos();
    this.cargarCampeonatos();
    this.cargarSanciones();
  }

  cargarTipos(): void {
    this.sancionesService.getTiposSancion(this.ligaId).subscribe({
      next: (t) => (this.tipos = t),
    });
  }

  cargarCampeonatos(): void {
    this.campeonatosService.getByLiga(this.ligaId).subscribe({
      next: (c) => (this.campeonatos = c),
    });
  }

  cargarSanciones(): void {
    this.cargando = true;
    const filtros: FiltrosSanciones = { ligaId: this.ligaId };
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
