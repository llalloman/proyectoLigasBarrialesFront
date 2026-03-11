import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { InscripcionesService } from '../inscripciones.service';
import { Inscripcion } from '../inscripcion.model';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-inscripciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './inscripciones-list.component.html',
  styleUrl: './inscripciones-list.component.scss'
})
export class InscripcionesListComponent implements OnInit {
  Math = Math;
  inscripciones: Inscripcion[] = [];
  loading = false;
  errorMessage = '';
  campeonatoId: number = 0;
  categoriaId: number = 0;
  campeonatoNombre = '';
  currentUser: any;
  user$: Observable<any>;

  // Paginación
  currentPage = 1;
  pageSize = 6;
  pageSizeOptions = [6, 12, 24];

  get paginatedInscripciones(): Inscripcion[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.inscripciones.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.inscripciones.length / this.pageSize);
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
    private inscripcionesService: InscripcionesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public permissions: PermissionsService
  ) {
    this.user$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.campeonatoId = Number(this.route.snapshot.queryParamMap.get('campeonatoId')) || 0;
    this.categoriaId = Number(this.route.snapshot.queryParamMap.get('categoriaId')) || 0;
    this.campeonatoNombre = this.route.snapshot.queryParamMap.get('nombre') || '';
    this.cargarInscripciones();
  }

  cargarInscripciones(): void {
    this.loading = true;
    this.errorMessage = '';

    let request;
    if (this.categoriaId) {
      request = this.inscripcionesService.getByCategoria(this.categoriaId);
    } else if (this.campeonatoId) {
      request = this.inscripcionesService.getByCampeonato(this.campeonatoId);
    } else {
      request = this.inscripcionesService.getAll();
    }

    request.subscribe({
      next: (data) => {
        this.inscripciones = data;
        this.currentPage = 1;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar las inscripciones';
        console.error(err);
        this.loading = false;
      }
    });
  }

  getEstadoClass(estado: string): string {
    const classes: any = {
      'pendiente': 'badge-warning',
      'confirmada': 'badge-success',
      'rechazada': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  getEstadoText(estado: string): string {
    const texts: any = {
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'rechazada': 'Rechazada',
      'transferida': 'Transferida'
    };
    return texts[estado] || estado;
  }

  confirmarInscripcion(id: number): void {
    if (confirm('¿Confirmar esta inscripción?')) {
      this.inscripcionesService.confirmar(id, '').subscribe({
        next: () => {
          this.cargarInscripciones();
        },
        error: (err) => {
          this.errorMessage = 'Error al confirmar la inscripción';
          console.error(err);
        }
      });
    }
  }

  rechazarInscripcion(id: number): void {
    const observaciones = prompt('Motivo del rechazo (requerido):');
    if (observaciones && observaciones.trim()) {
      this.inscripcionesService.rechazar(id, observaciones).subscribe({
        next: () => {
          this.cargarInscripciones();
        },
        error: (err) => {
          this.errorMessage = 'Error al rechazar la inscripción';
          console.error(err);
        }
      });
    } else if (observaciones !== null) {
      this.errorMessage = 'Debe proporcionar un motivo para el rechazo';
    }
  }

  eliminarInscripcion(id: number): void {
    if (confirm('¿Está seguro de eliminar esta inscripción?')) {
      this.inscripcionesService.delete(id).subscribe({
        next: () => {
          this.cargarInscripciones();
        },
        error: (err) => {
          this.errorMessage = 'Error al eliminar la inscripción';
          console.error(err);
        }
      });
    }
  }

  editarInscripcion(id: number): void {
    this.router.navigate(['/inscripciones/editar', id], {
      queryParams: { campeonatoId: this.campeonatoId }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  canCreate(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga', 'dirigente_equipo']);
  }

  canEdit(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga']);
  }

  canConfirm(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga']);
  }

  canManage(): boolean {
    return this.permissions.hasRole(['master', 'directivo_liga']);
  }

  nuevaInscripcion(): void {
    this.router.navigate(['/inscripciones/nuevo'], {
      queryParams: { 
        campeonatoId: this.campeonatoId || undefined,
        categoriaId: this.categoriaId || undefined
      }
    });
  }

  reintentarInscripcion(inscripcion: Inscripcion): void {
    // Redirigir al formulario de nueva inscripción con datos pre-cargados
    this.router.navigate(['/inscripciones/nuevo'], {
      queryParams: { 
        campeonatoId: inscripcion.campeonatoId,
        equipoId: inscripcion.equipoId,
        categoriaId: inscripcion.categoriaId,
        reintentar: 'true'
      }
    });
  }

  volverACategorias(): void {
    if (this.campeonatoId) {
      this.router.navigate(['/categorias'], {
        queryParams: { campeonatoId: this.campeonatoId }
      });
    }
  }
}
