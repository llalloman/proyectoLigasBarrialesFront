import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  Notificacion,
  NotificacionesService,
} from '../../core/services/notificaciones.service';
import { MainNavComponent } from '../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  readonly user$ = this.authService.currentUser$;
  notificaciones: Notificacion[] = [];
  estado = 'todas';
  tipo = '';
  page = 1;
  limit = 15;
  total = 0;
  noLeidas = 0;
  cargando = false;
  error = '';
  private readonly destroy$ = new Subject<void>();

  readonly tipos = [
    { value: '', label: 'Todos los tipos' },
    { value: 'habilitacion_solicitada', label: 'Solicitudes de habilitación' },
    { value: 'habilitacion_aprobada', label: 'Habilitaciones aprobadas' },
    { value: 'habilitacion_rechazada', label: 'Habilitaciones rechazadas' },
    { value: 'transferencia_solicitada', label: 'Solicitudes de transferencia' },
    { value: 'transferencia_pendiente_directivo', label: 'Transferencias por aprobar' },
    { value: 'transferencia_completada', label: 'Transferencias completadas' },
    { value: 'transferencia_rechazada_origen', label: 'Transferencias rechazadas por origen' },
    { value: 'transferencia_rechazada_directivo', label: 'Transferencias rechazadas por directivo' },
    { value: 'solicitud_horario_creada', label: 'Solicitudes de horario' },
    { value: 'solicitud_horario_aprobada', label: 'Horarios aprobados' },
    { value: 'solicitud_horario_rechazada', label: 'Horarios rechazados' },
    { value: 'solicitud_horario_cancelada', label: 'Horarios cancelados' },
    { value: 'programacion_confirmada', label: 'Programaciones confirmadas' },
    { value: 'programacion_reprogramada', label: 'Reprogramaciones' },
    { value: 'sancion_registrada', label: 'Sanciones registradas' },
    { value: 'sancion_actualizada', label: 'Sanciones actualizadas' },
    { value: 'sancion_resuelta', label: 'Resoluciones de sanciones' },
    { value: 'sancion_anulada', label: 'Sanciones anuladas' },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly notificacionesService: NotificacionesService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.notificacionesService.listar({
      estado: this.estado,
      tipo: this.tipo,
      page: this.page,
      limit: this.limit,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (respuesta) => {
        this.notificaciones = respuesta.items;
        this.total = respuesta.total;
        this.noLeidas = respuesta.noLeidas;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No fue posible cargar las notificaciones.';
        this.cargando = false;
      },
    });
  }

  cambiarFiltros(): void {
    this.page = 1;
    this.cargar();
  }

  abrir(notificacion: Notificacion): void {
    const navegar = () => this.router.navigateByUrl(notificacion.ruta || '/notificaciones');
    if (notificacion.leida) {
      navegar();
      return;
    }
    this.notificacionesService.marcarLeida(notificacion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: navegar, error: navegar });
  }

  marcarLeida(notificacion: Notificacion, event: Event): void {
    event.stopPropagation();
    if (notificacion.leida) return;
    this.notificacionesService.marcarLeida(notificacion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notificacion.leida = true;
          this.noLeidas = Math.max(0, this.noLeidas - 1);
        },
      });
  }

  marcarTodas(): void {
    this.notificacionesService.marcarTodasLeidas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cargar());
  }

  paginaAnterior(): void {
    if (this.page <= 1) return;
    this.page--;
    this.cargar();
  }

  paginaSiguiente(): void {
    if (this.page * this.limit >= this.total) return;
    this.page++;
    this.cargar();
  }

  icono(tipo: string): string {
    if (tipo.startsWith('habilitacion')) return '✅';
    if (tipo.startsWith('transferencia')) return '🔄';
    if (tipo.startsWith('solicitud_horario') || tipo.startsWith('programacion')) return '📅';
    if (tipo.startsWith('sancion')) return '⚖️';
    return '🔔';
  }

  logout(): void {
    this.notificacionesService.limpiarEstado();
    this.authService.logout();
  }
}
