import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransferenciasService } from '../transferencias.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { Transferencia } from '../transferencia.model';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-transferencias-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MainNavComponent],
  templateUrl: './transferencias-list.component.html',
  styleUrls: ['./transferencias-list.component.scss'],
})
export class TransferenciasListComponent implements OnInit {
  transferencias: Transferencia[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;
  currentUser: any = null;
  currentEquipoId: number | null = null;
  searchTerm: string = '';

  constructor(
    private transferenciasService: TransferenciasService,
    public permissions: PermissionsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        this.currentEquipoId = user.equipoId || null;
      }
    });
    this.loadTransferencias();
  }

  get filteredTransferencias(): Transferencia[] {
    if (!this.searchTerm.trim()) {
      return this.transferencias;
    }
    const search = this.searchTerm.toLowerCase().trim();
    return this.transferencias.filter((t) => {
      const nombreCompleto = t.jugador?.nombreCompleto?.toLowerCase() || '';
      const cedula = t.jugador?.cedula?.toLowerCase() || '';
      return nombreCompleto.includes(search) || cedula.includes(search);
    });
  }

  onSearchChange(): void {
    // El filtrado se hace automáticamente a través del getter
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  viewCedulaImage(imageUrl: string | undefined): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    } else {
      alert('No hay imagen de cédula disponible para este jugador');
    }
  }

  loadTransferencias(): void {
    this.loading = true;
    this.errorMessage = '';
    this.transferenciasService.getAll().subscribe({
      next: (transferencias) => {
        this.transferencias = transferencias;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transferencias:', error);
        this.errorMessage = 'Error al cargar las transferencias';
        this.loading = false;
      },
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'aprobado':
        return 'badge-aprobado';
      case 'rechazado':
        return 'badge-rechazado';
      case 'pendiente':
        return 'badge-pendiente';
      default:
        return '';
    }
  }

  getEstadoCompletoClass(transferencia: Transferencia): string {
    if (
      transferencia.estadoEquipoOrigen === 'aprobado' &&
      transferencia.estadoDirectivo === 'aprobado'
    ) {
      return 'badge-aprobado';
    }
    if (
      transferencia.estadoEquipoOrigen === 'rechazado' ||
      transferencia.estadoDirectivo === 'rechazado'
    ) {
      return 'badge-rechazado';
    }
    return 'badge-pendiente';
  }

  getEstadoCompletoText(transferencia: Transferencia): string {
    if (
      transferencia.estadoEquipoOrigen === 'aprobado' &&
      transferencia.estadoDirectivo === 'aprobado'
    ) {
      return 'Completada';
    }
    if (
      transferencia.estadoEquipoOrigen === 'rechazado' ||
      transferencia.estadoDirectivo === 'rechazado'
    ) {
      return 'Rechazada';
    }
    return 'En Proceso';
  }

  cancelar(id: number): void {
    if (confirm('¿Está seguro de cancelar esta transferencia?')) {
      this.transferenciasService.cancelar(id).subscribe({
        next: () => {
          this.successMessage = 'Transferencia cancelada';
          this.loadTransferencias();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error canceling transferencia:', error);
          this.errorMessage =
            error.error?.message || 'Error al cancelar la transferencia';
        },
      });
    }
  }

  canCancelar(transferencia: Transferencia): boolean {
    // Solo puede cancelar el equipo DESTINO (el que solicitó la transferencia)
    // Y solo si ambos estados están pendientes
    return (
      this.permissions.canCancelarTransferencia() &&
      this.currentEquipoId === transferencia.equipoDestinoId &&
      transferencia.estadoEquipoOrigen === 'pendiente' &&
      transferencia.estadoDirectivo === 'pendiente'
    );
  }

  logout(): void {
    this.authService.logout();
  }
}
