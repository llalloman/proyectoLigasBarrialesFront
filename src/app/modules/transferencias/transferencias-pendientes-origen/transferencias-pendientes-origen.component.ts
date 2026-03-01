import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TransferenciasService } from '../transferencias.service';
import { Transferencia } from '../transferencia.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-transferencias-pendientes-origen',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent],
  templateUrl: './transferencias-pendientes-origen.component.html',
  styleUrls: ['./transferencias-pendientes-origen.component.scss'],
})
export class TransferenciasPendientesOrigenComponent implements OnInit {
  transferencias: Transferencia[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;

  constructor(
    private transferenciasService: TransferenciasService,
    private authService: AuthService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.loadPendientes();
  }

  loadPendientes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.transferenciasService.getPendientesEquipoOrigen().subscribe({
      next: (transferencias) => {
        this.transferencias = transferencias;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pendientes:', error);
        this.errorMessage = 'Error al cargar las transferencias pendientes';
        this.loading = false;
      },
    });
  }

  aprobar(id: number): void {
    if (
      confirm(
        '¿Está seguro de aprobar esta transferencia? El jugador dejará su equipo una vez que el directivo también apruebe.'
      )
    ) {
      this.transferenciasService.aprobarPorEquipoOrigen(id).subscribe({
        next: () => {
          this.successMessage = 'Transferencia aprobada. Pendiente de aprobación del directivo.';
          this.loadPendientes();
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('Error approving transferencia:', error);
          this.errorMessage =
            error.error?.message || 'Error al aprobar la transferencia';
        },
      });
    }
  }

  rechazar(id: number): void {
    const observaciones = prompt(
      'Ingrese el motivo del rechazo (opcional):'
    );
    if (observaciones !== null) {
      this.transferenciasService
        .rechazarPorEquipoOrigen(id, observaciones)
        .subscribe({
          next: () => {
            this.successMessage = 'Transferencia rechazada';
            this.loadPendientes();
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Error rejecting transferencia:', error);
            this.errorMessage =
              error.error?.message || 'Error al rechazar la transferencia';
          },
        });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
