import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { JugadorCampeonatosService } from '../jugador-campeonatos.service';
import { JugadorCampeonato } from '../jugador-campeonato.model';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-jugador-campeonatos-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent, FormsModule],
  templateUrl: './jugador-campeonatos-list.component.html',
  styleUrls: ['./jugador-campeonatos-list.component.scss']
})
export class JugadorCampeonatosListComponent implements OnInit {
  jugadorCampeonatos: JugadorCampeonato[] = [];
  loading = false;
  errorMessage = '';
  user$: Observable<any>;
  campeonatoId: number | null = null;
  equipoId: number | null = null;
  campeonatoNombre = '';
  showImageModal = false;
  modalImageUrl = '';
  searchTerm = '';

  constructor(
    private jugadorCampeonatosService: JugadorCampeonatosService,
    private authService: AuthService,
    public permissions: PermissionsService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.campeonatoId = params['campeonatoId'] ? +params['campeonatoId'] : null;
      this.equipoId = params['equipoId'] ? +params['equipoId'] : null;
      this.loadJugadorCampeonatos();
    });
  }

  loadJugadorCampeonatos(): void {
    this.loading = true;
    this.errorMessage = '';

    let request: Observable<JugadorCampeonato[]>;

    if (this.campeonatoId && this.equipoId) {
      request = this.jugadorCampeonatosService.getByCampeonatoAndEquipo(this.campeonatoId, this.equipoId);
    } else if (this.campeonatoId) {
      request = this.jugadorCampeonatosService.getByCampeonato(this.campeonatoId);
    } else {
      request = this.jugadorCampeonatosService.getAll();
    }

    request.subscribe({
      next: (data) => {
        this.jugadorCampeonatos = data;
        if (data.length > 0 && data[0].campeonato) {
          this.campeonatoNombre = data[0].campeonato.nombre;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar habilitaciones:', error);
        this.errorMessage = 'Error al cargar las habilitaciones de jugadores';
        this.loading = false;
      }
    });
  }

  canCreate(): boolean {
    return this.permissions.canInscribirJugador();
  }

  canEdit(): boolean {
    return this.permissions.canEditJugadorCampeonato();
  }

  canApprove(): boolean {
    return this.permissions.canAprobarHabilitaciones();
  }

  getEstadoText(estado: string): string {
    const map: any = {
      'pendiente': 'Pendiente',
      'habilitado': 'Habilitado',
      'rechazado': 'Rechazado'
    };
    return map[estado] || estado;
  }

  aprobar(id: number): void {
    if (!confirm('¿Está seguro de aprobar esta habilitación?')) {
      return;
    }

    const observaciones = prompt('Observaciones (opcional):');
    
    this.jugadorCampeonatosService.aprobar(id, observaciones || undefined).subscribe({
      next: () => {
        alert('Habilitación aprobada exitosamente');
        this.loadJugadorCampeonatos();
      },
      error: (error) => {
        console.error('Error al aprobar:', error);
        alert('Error al aprobar la habilitación: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  rechazar(id: number): void {
    const observaciones = prompt('Ingrese el motivo del rechazo (obligatorio):');
    
    if (!observaciones || observaciones.trim() === '') {
      alert('Debe ingresar un motivo para rechazar');
      return;
    }

    this.jugadorCampeonatosService.rechazar(id, observaciones).subscribe({
      next: () => {
        alert('Habilitación rechazada');
        this.loadJugadorCampeonatos();
      },
      error: (error) => {
        console.error('Error al rechazar:', error);
        alert('Error al rechazar la habilitación: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  editar(id: number): void {
    this.router.navigate(['/jugador-campeonatos/editar', id]);
  }

  get filteredJugadorCampeonatos(): JugadorCampeonato[] {
    if (!this.searchTerm.trim()) {
      return this.jugadorCampeonatos;
    }

    const term = this.searchTerm.toLowerCase().trim();
    return this.jugadorCampeonatos.filter(jc => 
      jc.jugador?.nombre?.toLowerCase().includes(term) ||
      jc.jugador?.cedula?.toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  verHistorial(jugadorId: number): void {
    // Obtener todas las habilitaciones del jugador
    this.loading = true;
    this.jugadorCampeonatosService.getByJugador(jugadorId).subscribe({
      next: (habilitaciones) => {
        this.loading = false;
        if (habilitaciones.length === 0) {
          alert('Este jugador no tiene historial de habilitaciones.');
          return;
        }

        // Formatear el historial
        let historial = `HISTORIAL DE HABILITACIONES\n\n`;
        habilitaciones.forEach((h, index) => {
          historial += `${index + 1}. Campeonato: ${h.campeonato?.nombre || 'N/A'}\n`;
          historial += `   Equipo: ${h.equipo?.nombre || 'N/A'}\n`;
          historial += `   Estado: ${this.getEstadoText(h.estado)}\n`;
          historial += `   Fecha: ${new Date(h.fechaInscripcion).toLocaleDateString()}\n`;
          if (h.observaciones) {
            historial += `   Observaciones: ${h.observaciones}\n`;
          }
          historial += `   Activo: ${h.activo ? 'Sí' : 'No'}\n\n`;
        });

        alert(historial);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading historial:', error);
        this.errorMessage = 'Error al cargar el historial del jugador';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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
