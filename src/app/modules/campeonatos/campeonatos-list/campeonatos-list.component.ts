import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CampeonatosService } from '../campeonatos.service';
import { Campeonato, MovimientoPreview } from '../campeonato.model';
import { LigasService } from '../../../core/services/ligas.service';
import { Liga } from '../../../core/models/liga.model';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-campeonatos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './campeonatos-list.component.html',
  styleUrl: './campeonatos-list.component.scss'
})
export class CampeonatosListComponent implements OnInit {
  Math = Math;
  campeonatos: Campeonato[] = [];
  filteredCampeonatos: Campeonato[] = [];
  ligas: Liga[] = [];
  loading = false;
  errorMessage = '';
  searchTerm: string = '';
  selectedLigaId: string = '';
  selectedEstado: string = '';
  isMaster = false;
  user$: Observable<any>;

  // Modal finalizar temporada
  modalCampeonato: Campeonato | null = null;
  previewMovimientos: MovimientoPreview[] = [];
  etapaModal: string = '';
  previewCargando = false;
  procesandoFinalizar = false;
  modalResultado: string | null = null;

  // Paginación
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];

  get paginatedCampeonatos(): Campeonato[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCampeonatos.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCampeonatos.length / this.pageSize);
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
    private campeonatosService: CampeonatosService,
    private ligasService: LigasService,
    private router: Router,
    private authService: AuthService,
    public permissions: PermissionsService
  ) {
    this.user$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.checkUserRole();
    this.loadLigas();
    this.loadCampeonatos();
  }

  checkUserRole(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isMaster = currentUser?.rol?.nombre === 'master';
  }

  loadCampeonatos(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.campeonatosService.getAll().subscribe({
      next: (data: Campeonato[]) => {
        this.campeonatos = data;
        this.filteredCampeonatos = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = 'Error al cargar campeonatos';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  verCategorias(campeonatoId: number): void {
    this.router.navigate(['/categorias'], { queryParams: { campeonatoId } });
  }

  verInscripciones(campeonatoId: number): void {
    this.router.navigate(['/inscripciones'], { queryParams: { campeonatoId } });
  }

  editarCampeonato(id: number): void {
    this.router.navigate(['/campeonatos/editar', id]);
  }

  cambiarEstado(campeonato: Campeonato, nuevoEstado: string): void {
    if (confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) {
      this.campeonatosService.cambiarEstado(campeonato.id, nuevoEstado).subscribe({
        next: () => {
          this.loadCampeonatos();
        },
        error: (err: any) => {
          this.errorMessage = 'Error al cambiar estado: ' + (err.error?.message || 'Error desconocido');
          console.error('Error:', err);
        }
      });
    }
  }

  eliminarCampeonato(id: number): void {
    if (confirm('¿Estás seguro de deshabilitar este campeonato?')) {
      this.campeonatosService.delete(id).subscribe({
        next: () => {
          this.loadCampeonatos();
        },
        error: (err: any) => {
          this.errorMessage = 'Error al eliminar: ' + (err.error?.message || 'Error desconocido');
          console.error('Error:', err);
        }
      });
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'inscripcion_abierta':
        return 'badge-success';
      case 'en_curso':
        return 'badge-primary';
      case 'finalizado':
        return 'badge-secondary';
      case 'cancelado':
        return 'badge-danger';
      default:
        return '';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'inscripcion_abierta':
        return 'Inscripción Abierta';
      case 'en_curso':
        return 'En Curso';
      case 'finalizado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  canCreate(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga']);
  }

  canEdit(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga']);
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

  onEstadoChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.campeonatos;

    // Filtrar por liga (solo para master)
    if (this.selectedLigaId) {
      const ligaId = Number(this.selectedLigaId);
      filtered = filtered.filter(campeonato => campeonato.liga?.id === ligaId);
    }

    // Filtrar por estado
    if (this.selectedEstado) {
      filtered = filtered.filter(campeonato => campeonato.estado === this.selectedEstado);
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter((campeonato) => {
        const nombre = campeonato.nombre?.toLowerCase() || '';
        const descripcion = campeonato.descripcion?.toLowerCase() || '';
        const liga = campeonato.liga?.nombre?.toLowerCase() || '';
        
        return (
          nombre.includes(searchLower) ||
          descripcion.includes(searchLower) ||
          liga.includes(searchLower)
        );
      });
    }

    this.filteredCampeonatos = filtered;
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedLigaId = '';
    this.selectedEstado = '';
    this.filteredCampeonatos = this.campeonatos;
    this.currentPage = 1;
  }

  canShowFilters(): boolean {
    const currentUser = this.authService.getCurrentUser();
    const rolNombre = currentUser?.rol?.nombre;
    return rolNombre === 'master' || rolNombre === 'directivo_liga';
  }

  abrirModalFinalizar(campeonato: Campeonato): void {
    this.modalCampeonato = campeonato;
    this.previewMovimientos = [];
    this.etapaModal = '';
    this.previewCargando = false;
    this.procesandoFinalizar = false;
    this.modalResultado = null;
  }

  cerrarModal(): void {
    this.modalCampeonato = null;
    this.previewMovimientos = [];
    this.etapaModal = '';
    this.modalResultado = null;
  }

  cargarPreviewModal(): void {
    if (!this.modalCampeonato || !this.etapaModal.trim()) return;
    this.previewCargando = true;
    this.previewMovimientos = [];
    this.campeonatosService.previewAscensosDescensos(this.modalCampeonato.id, this.etapaModal.trim()).subscribe({
      next: (movimientos) => {
        this.previewMovimientos = movimientos;
        this.previewCargando = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar preview: ' + (err.error?.message || 'Error desconocido');
        this.previewCargando = false;
      }
    });
  }

  confirmarFinalizar(): void {
    if (!this.modalCampeonato || !this.etapaModal.trim()) return;
    if (!confirm(`¿Confirmar finalización del campeonato "${this.modalCampeonato.nombre}"? Esta acción procesará los ascensos/descensos y no se puede deshacer.`)) return;
    this.procesandoFinalizar = true;
    this.campeonatosService.procesarAscensosDescensos(this.modalCampeonato.id, this.etapaModal.trim()).subscribe({
      next: (resultado) => {
        this.procesandoFinalizar = false;
        this.modalResultado = `Temporada finalizada. Procesados: ${resultado.procesados}, Saltados: ${resultado.saltados}.`;
        this.loadCampeonatos();
      },
      error: (err) => {
        this.procesandoFinalizar = false;
        this.errorMessage = 'Error al finalizar: ' + (err.error?.message || 'Error desconocido');
      }
    });
  }
}
