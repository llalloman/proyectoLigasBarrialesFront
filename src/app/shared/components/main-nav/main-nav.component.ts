import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PermissionsService } from '@core/services/permissions.service';
import { Router } from '@angular/router';
import { Subject, takeUntil, timer } from 'rxjs';
import { Notificacion, NotificacionesService } from '@core/services/notificaciones.service';

/**
 * Componente centralizado de navegación principal
 * Se usa en todas las vistas para mantener consistencia
 * Controla la visibilidad de módulos según el rol del usuario
 */
@Component({
  selector: 'app-main-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss'
})
export class MainNavComponent implements OnInit, OnDestroy {
  readonly noLeidas$ = this.notificacionesService.noLeidas$;
  readonly recientes$ = this.notificacionesService.recientes$;
  panelNotificacionesAbierto = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public permissions: PermissionsService,
    private readonly notificacionesService: NotificacionesService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    timer(0, 60000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notificacionesService.actualizarResumen()
        .pipe(takeUntil(this.destroy$))
        .subscribe({ error: () => undefined });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  alternarNotificaciones(): void {
    this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto;
    if (this.panelNotificacionesAbierto) {
      this.notificacionesService.actualizarResumen()
        .pipe(takeUntil(this.destroy$))
        .subscribe({ error: () => undefined });
    }
  }

  abrirNotificacion(notificacion: Notificacion): void {
    this.panelNotificacionesAbierto = false;
    const navegar = () => this.router.navigateByUrl(notificacion.ruta || '/notificaciones');
    if (notificacion.leida) {
      navegar();
      return;
    }
    this.notificacionesService.marcarLeida(notificacion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: navegar, error: navegar });
  }
}
