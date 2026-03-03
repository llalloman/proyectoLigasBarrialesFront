import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JugadoresService } from '../../../core/services/jugadores.service';
import { LigasService } from '../../../core/services/ligas.service';
import { EquiposService } from '../../../core/services/equipos.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '@core/services/permissions.service';
import { Jugador } from '../../../core/models/jugador.model';
import { Usuario } from '../../../core/models/usuario.model';
import { Liga } from '../../../core/models/liga.model';
import { Equipo } from '../../../core/models/equipo.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-jugadores-list',
  templateUrl: './jugadores-list.component.html',
  styleUrl: './jugadores-list.component.scss'
})
export class JugadoresListComponent implements OnInit {
  Math = Math;
  jugadores: Jugador[] = [];
  ligas: Liga[] = [];
  equipos: Equipo[] = [];
  filteredEquipos: Equipo[] = [];
  loading = false;
  errorMessage = '';
  user$: Observable<Usuario | null>;
  isMaster = false;
  searchTerm = '';
  selectedLigaId: string = '';
  selectedEquipoId: string = '';

  // Paginación
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];

  get paginatedJugadores(): Jugador[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredJugadores.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredJugadores.length / this.pageSize);
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

  constructor(
    private jugadoresService: JugadoresService,
    private ligasService: LigasService,
    private equiposService: EquiposService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionsService
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.checkUserRole();
    this.loadFilters();
    this.loadJugadores();
  }

  checkUserRole(): void {
    this.authService.user$.subscribe((user: Usuario | null) => {
      if (user) {
        this.isMaster = user.rol.nombre === 'master';
      }
    });
  }

  loadJugadores(): void {
    this.loading = true;
    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Verificar si el usuario tiene asignación según su rol
    if (rolNombre === 'directivo_liga' && !currentUser?.ligaId) {
      this.errorMessage = 'No tienes una liga asignada aún. Contacta al administrador.';
      this.loading = false;
      this.jugadores = [];
      return;
    }

    if (rolNombre === 'dirigente_equipo' && !currentUser?.equipoId) {
      this.errorMessage = 'No tienes un equipo asignado aún. Contacta al administrador o directivo de liga.';
      this.loading = false;
      this.jugadores = [];
      return;
    }

    this.jugadoresService.getAll().subscribe({
      next: (jugadores) => {
        this.jugadores = jugadores;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading jugadores:', error);
        this.errorMessage = 'Error al cargar los jugadores';
        this.loading = false;
      }
    });
  }

  viewJugador(id: number): void {
    this.router.navigate(['/jugadores', id]);
  }

  editJugador(id: number): void {
    this.router.navigate(['/jugadores/edit', id]);
  }

  createJugador(): void {
    this.router.navigate(['/jugadores/new']);
  }

  get filteredJugadores(): Jugador[] {
    let filtered = this.jugadores;

    // Filtrar por liga (solo para master)
    if (this.selectedLigaId && this.isMaster) {
      const ligaId = Number(this.selectedLigaId);
      filtered = filtered.filter(jugador => 
        jugador.equipo?.ligaId === ligaId
      );
    }

    // Filtrar por equipo
    if (this.selectedEquipoId) {
      const equipoId = Number(this.selectedEquipoId);
      filtered = filtered.filter(jugador => 
        jugador.equipo?.id === equipoId
      );
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(jugador => 
        jugador.nombre.toLowerCase().includes(term) ||
        jugador.cedula?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.clearFilters();
  }

  loadFilters(): void {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Cargar ligas solo para master
    if (rolNombre === 'master') {
      this.ligasService.getAll().subscribe({
        next: (ligas) => {
          this.ligas = ligas.filter(liga => liga.activo);
        },
        error: (error) => {
          console.error('Error loading ligas:', error);
        }
      });
    }

    // Cargar equipos (para master y directivo_liga)
    if (rolNombre === 'master' || rolNombre === 'directivo_liga') {
      this.equiposService.getAll().subscribe({
        next: (equipos) => {
          this.equipos = equipos.filter(equipo => equipo.activo);
          this.filteredEquipos = this.equipos;
        },
        error: (error) => {
          console.error('Error loading equipos:', error);
        }
      });
    }
  }

  onLigaChange(): void {
    this.selectedEquipoId = '';
    this.currentPage = 1;

    if (this.selectedLigaId) {
      const ligaId = Number(this.selectedLigaId);
      this.filteredEquipos = this.equipos.filter(equipo => equipo.ligaId === ligaId);
    } else {
      this.filteredEquipos = this.equipos;
    }
  }

  clearFilters(): void {
    this.selectedLigaId = '';
    this.selectedEquipoId = '';
    this.searchTerm = '';
    this.filteredEquipos = this.equipos;
    this.currentPage = 1;
  }

  canShowFilters(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;
    return rolNombre === 'master' || rolNombre === 'directivo_liga';
  }

  canCreateJugador(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;
    
    // Master puede crear siempre
    if (rolNombre === 'master') {
      return true;
    }
    
    // Directivo de liga solo si tiene liga asignada
    if (rolNombre === 'directivo_liga') {
      return !!currentUser?.ligaId;
    }
    
    // Dirigente de equipo solo si tiene equipo asignado
    if (rolNombre === 'dirigente_equipo') {
      return !!currentUser?.equipoId;
    }
    
    return false;
  }

  disableJugador(jugador: Jugador): void {
    if (confirm(`¿Está seguro de desactivar al jugador ${jugador.nombre}?`)) {
      this.jugadoresService.delete(jugador.id).subscribe({
        next: () => {
          this.loadJugadores();
        },
        error: (error) => {
          console.error('Error disabling jugador:', error);
          this.errorMessage = 'Error al desactivar el jugador';
        }
      });
    }
  }

  deleteJugadorPermanently(jugador: Jugador): void {
    if (confirm(`¿Está seguro de ELIMINAR PERMANENTEMENTE al jugador ${jugador.nombre}? Esta acción no se puede deshacer.`)) {
      this.jugadoresService.deletePermanently(jugador.id).subscribe({
        next: () => {
          this.loadJugadores();
        },
        error: (error) => {
          console.error('Error deleting jugador:', error);
          this.errorMessage = 'Error al eliminar el jugador';
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
