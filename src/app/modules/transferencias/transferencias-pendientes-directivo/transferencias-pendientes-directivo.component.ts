import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TransferenciasService } from '../transferencias.service';
import { Transferencia } from '../transferencia.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { PdfTransferenciaService } from '../../../core/services/pdf-transferencia.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-transferencias-pendientes-directivo',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent],
  templateUrl: './transferencias-pendientes-directivo.component.html',
  styleUrls: ['./transferencias-pendientes-directivo.component.scss'],
})
export class TransferenciasPendientesDirectivoComponent implements OnInit {
  transferencias: Transferencia[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;

  constructor(
    private transferenciasService: TransferenciasService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private pdfTransferenciaService: PdfTransferenciaService
  ) {}

  ngOnInit(): void {
    this.loadPendientes();
  }

  loadPendientes(): void {
    this.loading = true;
    this.errorMessage = '';
    this.transferenciasService.getPendientesDirectivo().subscribe({
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
        '¿Está seguro de aprobar esta transferencia? El jugador será transferido al nuevo equipo.'
      )
    ) {
      this.transferenciasService.aprobarPorDirectivo(id).subscribe({
        next: () => {
          this.successMessage =
            'Transferencia aprobada. El jugador ha sido transferido al nuevo equipo.';
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
        .rechazarPorDirectivo(id, observaciones)
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

  getEstadoEquipoOrigenClass(estado: string): string {
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

  /**
   * Descarga el PDF de la transferencia
   */
  async descargarPdf(transferencia: Transferencia): Promise<void> {
    try {
      await this.pdfTransferenciaService.generarPdfTransferencia(transferencia);
      this.successMessage = 'PDF generado exitosamente';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.errorMessage = 'Error al generar el PDF';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
