import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { ConfiguracionService } from './configuracion.service';

/**
 * Servicio para gestionar permisos basados en roles
 * Centraliza la lógica de autorización
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  constructor(private authService: AuthService, private configuracionService: ConfiguracionService) {}

  /**
   * Verifica si un módulo está habilitado para el dirigente actual
   * Master y directivo_liga siempre tienen acceso independientemente de la configuración
   */
  private isModuloAccesible(clave: string): boolean {
    if (!this.isDirigente()) return true;
    return this.configuracionService.isHabilitado(clave);
  }

  /**
   * Verifica si el usuario tiene uno de los roles especificados
   */
  hasRole(roles: string[]): boolean {
    const user = this.authService.currentUserValue;
    return !!(user && roles.includes(user.rol.nombre));
  }

  /**
   * Verifica si el usuario es master
   */
  isMaster(): boolean {
    return this.hasRole(['master']);
  }

  /**
   * Verifica si el usuario es directivo de liga
   */
  isDirectivo(): boolean {
    return this.hasRole(['directivo_liga']);
  }

  /**
   * Verifica si el usuario es dirigente de equipo
   */
  isDirigente(): boolean {
    return this.hasRole(['dirigente_equipo']);
  }

  /**
   * Verifica si puede acceder al módulo de ligas
   */
  canAccessLigas(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede acceder al módulo de equipos
   */
  canAccessEquipos(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo']);
  }

  /**
   * Verifica si puede acceder al módulo de jugadores
   */
  canAccessJugadores(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_jugadores');
  }

  /**
   * Verifica si puede acceder al módulo de usuarios
   */
  canAccessUsuarios(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede crear una liga
   */
  canCreateLiga(): boolean {
    return this.isMaster();
  }

  /**
   * Verifica si puede editar una liga
   */
  canEditLiga(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar una liga
   */
  canDeleteLiga(): boolean {
    return this.isMaster();
  }

  /**
   * Verifica si puede crear un equipo
   */
  canCreateEquipo(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede editar un equipo
   */
  canEditEquipo(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar un equipo
   */
  canDeleteEquipo(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede crear un jugador
   */
  canCreateJugador(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_jugadores');
  }

  canEditJugador(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_jugadores');
  }

  canDeleteJugador(): boolean {
    return this.hasRole(['master', 'directivo_liga'])
      && this.isModuloAccesible('modulo_jugadores');
  }

  /**
   * Verifica si puede acceder al módulo de campeonatos
   */
  canAccessCampeonatos(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo']);
  }

  /**
   * Verifica si puede crear un campeonato
   */
  canCreateCampeonato(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede editar un campeonato
   */
  canEditCampeonato(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar un campeonato
   */
  canDeleteCampeonato(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede acceder al módulo de categorías
   */
  canAccessCategorias(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo']);
  }

  /**
   * Verifica si puede crear una categoría
   */
  canCreateCategoria(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede editar una categoría
   */
  canEditCategoria(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar una categoría
   */
  canDeleteCategoria(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede acceder al módulo de inscripciones
   */
  canAccessInscripciones(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_inscripciones');
  }

  canCreateInscripcion(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_inscripciones');
  }

  /**
   * Verifica si puede confirmar/rechazar una inscripción
   */
  canManageInscripcion(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar una inscripción
   */
  canDeleteInscripcion(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  // ==================== HABILITACIÓN DE JUGADORES ====================

  /**
   * Verifica si puede acceder al módulo de habilitación de jugadores
   */
  canAccessJugadorCampeonatos(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_inscripciones');
  }

  canInscribirJugador(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_inscripciones');
  }

  canEditJugadorCampeonato(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_inscripciones');
  }

  /**
   * Verifica si puede aprobar/rechazar habilitaciones
   */
  canAprobarHabilitaciones(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede eliminar habilitación de jugadores
   */
  canDeleteJugadorCampeonato(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  // ==================== TRANSFERENCIAS ====================

  /**
   * Verifica si puede acceder al módulo de transferencias
   */
  canAccessTransferencias(): boolean {
    return this.hasRole(['master', 'directivo_liga', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_transferencias');
  }

  canSolicitarTransferencia(): boolean {
    return this.hasRole(['master', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_transferencias');
  }

  canAprobarTransferenciaEquipoOrigen(): boolean {
    return this.hasRole(['master', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_transferencias');
  }

  /**
   * Verifica si puede aprobar transferencias como directivo
   */
  canAprobarTransferenciaDirectivo(): boolean {
    return this.hasRole(['master', 'directivo_liga']);
  }

  /**
   * Verifica si puede cancelar transferencias
   */
  canCancelarTransferencia(): boolean {
    return this.hasRole(['master', 'dirigente_equipo'])
      && this.isModuloAccesible('modulo_transferencias');
  }
}
