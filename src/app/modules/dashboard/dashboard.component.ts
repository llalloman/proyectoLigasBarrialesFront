import { Component } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { PermissionsService } from '@core/services/permissions.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  user$ = this.authService.currentUser$;

  constructor(
    private authService: AuthService,
    private router: Router,
    public permissions: PermissionsService
  ) {}

  logout(): void {
    this.authService.logout();
  }

  // Métodos para verificar permisos (usando el servicio centralizado)
  canAccessLigas(): boolean {
    return this.permissions.canAccessLigas();
  }

  canAccessEquipos(): boolean {
    return this.permissions.canAccessEquipos();
  }

  canAccessJugadores(): boolean {
    return this.permissions.canAccessJugadores();
  }

  canAccessUsuarios(): boolean {
    return this.permissions.canAccessUsuarios();
  }

  canAccessCampeonatos(): boolean {
    return this.permissions.canAccessCampeonatos();
  }

  canAccessCategorias(): boolean {
    return this.permissions.canAccessCategorias();
  }

  canAccessInscripciones(): boolean {
    return this.permissions.canAccessInscripciones();
  }

  canAccessJugadorCampeonatos(): boolean {
    return this.permissions.canAccessJugadorCampeonatos();
  }

  canAccessTransferencias(): boolean {
    return this.permissions.canAccessTransferencias();
  }

  canAccessPartidos(): boolean {
    return this.permissions.canAccessPartidos();
  }
}
