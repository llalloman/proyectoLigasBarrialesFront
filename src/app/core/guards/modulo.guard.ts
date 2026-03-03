import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ConfiguracionService } from '../services/configuracion.service';

/**
 * Guard para controlar el acceso a módulos según la configuración global del sistema
 * Solo aplica restricciones a los dirigentes de equipo
 * Master y directivo_liga siempre tienen acceso
 */
@Injectable({
  providedIn: 'root',
})
export class ModuloGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private configuracionService: ConfiguracionService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const user = this.authService.currentUserValue;

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // Master y directivo_liga siempre tienen acceso
    if (user.rol.nombre !== 'dirigente_equipo') {
      return true;
    }

    const modulo = route.data['modulo'] as string;
    if (!modulo) return true;

    // Si ya tenemos la config en caché, verificar directamente
    if (this.configuracionService.isLoaded()) {
      return this.checkModulo(modulo);
    }

    // Si no está cargada aún, cargarla primero
    return this.configuracionService.cargar().pipe(
      map(() => this.checkModulo(modulo))
    );
  }

  private checkModulo(modulo: string): boolean | UrlTree {
    if (this.configuracionService.isHabilitado(modulo)) {
      return true;
    }
    return this.router.createUrlTree(['/dashboard'], {
      queryParams: { modulo_bloqueado: modulo },
    });
  }
}
