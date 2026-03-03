import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EquiposService } from '../../../core/services/equipos.service';
import { LigasService } from '../../../core/services/ligas.service';
import { AuthService } from '../../../core/services/auth.service';import { PermissionsService } from '@core/services/permissions.service';import { Equipo } from '../../../core/models/equipo.model';
import { Liga } from '../../../core/models/liga.model';

@Component({
  selector: 'app-equipos-list',
  templateUrl: './equipos-list.component.html',
  styleUrl: './equipos-list.component.scss'
})
export class EquiposListComponent implements OnInit {
  Math = Math;
  equipos: Equipo[] = [];
  filteredEquipos: Equipo[] = [];
  ligas: Liga[] = [];
  searchTerm: string = '';
  selectedLigaId: string = '';
  loading = false;
  errorMessage = '';
  isMaster = false;
  user$ = this.authService.currentUser$;

  // Paginación
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];

  get paginatedEquipos(): Equipo[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEquipos.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEquipos.length / this.pageSize);
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
    private equiposService: EquiposService,
    private ligasService: LigasService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadLigas();
    this.loadEquipos();
  }

  checkUserRole(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isMaster = currentUser?.rol?.nombre === 'master';
  }

  loadEquipos(): void {
    this.loading = true;
    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;

    // Verificar si el usuario tiene asignación según su rol
    if (rolNombre === 'directivo_liga' && !currentUser?.ligaId) {
      this.errorMessage = 'No tienes una liga asignada aún. Contacta al administrador.';
      this.loading = false;
      this.equipos = [];
      return;
    }

    if (rolNombre === 'dirigente_equipo' && !currentUser?.equipoId) {
      this.errorMessage = 'No tienes un equipo asignado aún. Contacta al administrador o directivo de liga.';
      this.loading = false;
      this.equipos = [];
      return;
    }

    this.equiposService.getAll().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        this.filteredEquipos = equipos;
        this.currentPage = 1;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al cargar los equipos';
        this.loading = false;
      },
    });
  }

  viewEquipo(id: number): void {
    this.router.navigate(['/equipos', id]);
  }

  editEquipo(id: number): void {
    this.router.navigate(['/equipos/edit', id]);
  }

  disableEquipo(equipo: Equipo): void {
    if (confirm(`¿Estás seguro de desactivar el equipo "${equipo.nombre}"?`)) {
      this.equiposService.delete(equipo.id).subscribe({
        next: () => {
          this.loadEquipos();
        },
        error: (error) => {
          alert(error.error?.message || 'Error al desactivar el equipo');
        },
      });
    }
  }

  deleteEquipoPermanently(equipo: Equipo): void {
    if (confirm(`⚠️ ¿Estás seguro de ELIMINAR PERMANENTEMENTE el equipo "${equipo.nombre}"? Esta acción no se puede deshacer.`)) {
      this.equiposService.deletePermanently(equipo.id).subscribe({
        next: (response) => {
          alert(response.message);
          this.loadEquipos();
        },
        error: (error) => {
          alert(error.error?.message || 'Error al eliminar el equipo permanentemente');
        },
      });
    }
  }

  createEquipo(): void {
    this.router.navigate(['/equipos/new']);
  }

  canCreateEquipo(): boolean {
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
    
    return false;
  }

  canShowSearchBar(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;
    
    // Solo master y directivo_liga pueden ver el buscador
    return rolNombre === 'master' || rolNombre === 'directivo_liga';
  }

  loadLigas(): void {
    // Solo cargar ligas para master
    if (!this.isMaster) {
      return;
    }

    this.ligasService.getAll().subscribe({
      next: (ligas) => {
        this.ligas = ligas.filter(liga => liga.activo);
      },
      error: (error) => {
        console.error('Error loading ligas:', error);
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onLigaChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.equipos;

    // Filtrar por liga (solo para master)
    if (this.selectedLigaId) {
      const ligaId = Number(this.selectedLigaId);
      filtered = filtered.filter(equipo => equipo.ligaId === ligaId);
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter((equipo) => {
        const nombre = equipo.nombre?.toLowerCase() || '';
        const liga = equipo.liga?.nombre?.toLowerCase() || '';
        const dirigente = equipo.dirigente?.nombre?.toLowerCase() || '';
        const representante = equipo.representante?.toLowerCase() || '';
        
        return (
          nombre.includes(searchLower) ||
          liga.includes(searchLower) ||
          dirigente.includes(searchLower) ||
          representante.includes(searchLower)
        );
      });
    }

    this.filteredEquipos = filtered;
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.selectedLigaId = '';
    this.filteredEquipos = this.equipos;
    this.currentPage = 1;
  }

  logout(): void {
    this.authService.logout();
  }
}
