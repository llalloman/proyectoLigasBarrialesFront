import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JugadorCampeonatosService } from '../jugador-campeonatos.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { JugadorCampeonato } from '../jugador-campeonato.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-jugador-campeonatos-pendientes',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent, FormsModule],
  templateUrl: './jugador-campeonatos-pendientes.component.html',
  styleUrls: ['./jugador-campeonatos-pendientes.component.scss'],
})
export class JugadorCampeonatosPendientesComponent implements OnInit {
  habilitaciones: JugadorCampeonato[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;
  showImageModal = false;
  modalImageUrl = '';
  searchTerm = '';

  constructor(
    private jugadorCampeonatosService: JugadorCampeonatosService,
    public permissions: PermissionsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPendientes();
  }

  loadPendientes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.jugadorCampeonatosService.getPendientes().subscribe({
      next: (habilitaciones) => {
        this.habilitaciones = habilitaciones;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pendientes:', error);
        this.errorMessage = 'Error al cargar las habilitaciones pendientes';
        this.loading = false;
      },
    });
  }

  aprobar(id: number): void {
    if (confirm('¿Está seguro de aprobar esta habilitación?')) {
      this.jugadorCampeonatosService.aprobar(id).subscribe({
        next: () => {
          this.successMessage = 'Habilitación aprobada exitosamente';
          this.loadPendientes();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error approving habilitacion:', error);
          this.errorMessage =
            error.error?.message || 'Error al aprobar la habilitación';
        },
      });
    }
  }

  rechazar(id: number): void {
    const observaciones = prompt(
      'Ingrese el motivo del rechazo. El dirigente podrá volver a solicitar la habilitación corrigiendo los detalles:'
    );
    if (observaciones !== null) {
      this.jugadorCampeonatosService
        .rechazar(id, observaciones)
        .subscribe({
          next: () => {
            this.successMessage = 'Habilitación rechazada. El jugador podrá ser habilitado nuevamente con una nueva solicitud.';
            this.loadPendientes();
            setTimeout(() => {
              this.successMessage = '';
            }, 5000);
          },
          error: (error) => {
            console.error('Error rejecting habilitacion:', error);
            this.errorMessage =
              error.error?.message || 'Error al rechazar la habilitación';
          },
        });
    }
  }

  get filteredHabilitaciones(): JugadorCampeonato[] {
    if (!this.searchTerm.trim()) {
      return this.habilitaciones;
    }

    const term = this.searchTerm.toLowerCase().trim();
    return this.habilitaciones.filter(h => 
      h.jugador?.nombre?.toLowerCase().includes(term) ||
      h.jugador?.cedula?.toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  logout(): void {
    this.authService.logout();
  }

  openImageModal(imageUrl: string): void {
    this.modalImageUrl = imageUrl;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.modalImageUrl = '';
  }
}
