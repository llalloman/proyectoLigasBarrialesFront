import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuariosService, Usuario } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '@core/services/permissions.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-usuarios-list',
  templateUrl: './usuarios-list.component.html',
  styleUrls: ['./usuarios-list.component.scss'],
})
export class UsuariosListComponent implements OnInit {
  usuarios: Usuario[] = [];
  filteredUsuarios: Usuario[] = [];
  loading = false;
  searchTerm = '';
  filterActive: 'all' | 'active' | 'inactive' = 'all';
  user$ = this.authService.currentUser$;

  // Paginación
  Math = Math;
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];

  get paginatedUsuarios(): Usuario[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsuarios.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsuarios.length / this.pageSize);
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  constructor(
    private usuariosService: UsuariosService,
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();
    
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        if (currentUser?.rol?.nombre === 'directivo_liga') {
          // Directivo_liga: solo mostrar dirigentes de su liga
          if (currentUser.ligaId) {
            this.usuarios = data.filter(u => 
              u.rol.nombre === 'dirigente_equipo' && u.ligaId === currentUser.ligaId
            );
          } else {
            // Directivo sin liga asignada no ve ningún usuario
            this.usuarios = [];
          }
        } else if (currentUser?.rol?.nombre === 'master') {
          // Master ve todos
          this.usuarios = data;
        } else {
          // Otros roles no ven usuarios
          this.usuarios = [];
        }
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let filtered = this.usuarios;

    // Filtrar por estado activo
    if (this.filterActive === 'active') {
      filtered = filtered.filter((u) => u.activo);
    } else if (this.filterActive === 'inactive') {
      filtered = filtered.filter((u) => !u.activo);
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.nombre.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.rol.nombre.toLowerCase().includes(term)
      );
    }

    this.filteredUsuarios = filtered;
    this.currentPage = 1;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  createUsuario(): void {
    this.router.navigate(['/usuarios/nuevo']);
  }

  editUsuario(id: number): void {
    this.router.navigate(['/usuarios/editar', id]);
  }

  changePassword(id: number): void {
    this.router.navigate(['/usuarios/cambiar-password', id]);
  }

  toggleActive(usuario: Usuario): void {
    const action = usuario.activo ? 'desactivar' : 'activar';
    if (confirm(`¿Está seguro de ${action} este usuario?`)) {
      const service$ = usuario.activo
        ? this.usuariosService.deactivateUsuario(usuario.id)
        : this.usuariosService.activateUsuario(usuario.id);

      service$.subscribe({
        next: () => {
          this.loadUsuarios();
        },
        error: (error) => {
          console.error(`Error al ${action} usuario:`, error);
          alert(error.error?.message || `Error al ${action} usuario`);
        },
      });
    }
  }

  deleteUsuario(usuario: Usuario): void {
    if (confirm(`¿Está seguro de eliminar el usuario "${usuario.nombre}"?`)) {
      this.usuariosService.deleteUsuario(usuario.id).subscribe({
        next: () => {
          this.loadUsuarios();
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          alert(error.error?.message || 'Error al eliminar usuario');
        },
      });
    }
  }

  getRolBadgeClass(rolNombre: string): string {
    const rolMap: { [key: string]: string } = {
      master: 'badge-master',
      directivo_liga: 'badge-directivo',
      dirigente_equipo: 'badge-dirigente',
    };
    return rolMap[rolNombre] || 'badge-default';
  }

  canEdit(): boolean {
    const user = this.authService.getCurrentUser();
    if (user?.rol?.nombre === 'master') {
      return true;
    }
    if (user?.rol?.nombre === 'directivo_liga' && user?.ligaId) {
      return true;
    }
    return false;
  }

  logout(): void {
    this.authService.logout();
  }
}
