import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfiguracionService,
  ConfiguracionItem,
} from '../../../core/services/configuracion.service';

interface ModuloConfig {
  clave: string;
  nombre: string;
  descripcion: string;
  icono: string;
  habilitado: boolean;
  cargando: boolean;
}

@Component({
  selector: 'app-configuracion-admin',
  templateUrl: './configuracion-admin.component.html',
  styleUrls: ['./configuracion-admin.component.scss'],
})
export class ConfiguracionAdminComponent implements OnInit {
  user$ = this.authService.currentUser$;
  loading = false;
  successMessage = '';
  errorMessage = '';

  modulos: ModuloConfig[] = [
    {
      clave: 'modulo_jugadores',
      nombre: 'Módulo de Jugadores',
      descripcion: 'Permite a los dirigentes registrar y editar jugadores en el sistema.',
      icono: '👥',
      habilitado: true,
      cargando: false,
    },
    {
      clave: 'modulo_inscripciones',
      nombre: 'Módulo de Inscripciones / Habilitaciones',
      descripcion: 'Permite a los dirigentes inscribir y habilitar jugadores en campeonatos.',
      icono: '✅',
      habilitado: true,
      cargando: false,
    },
    {
      clave: 'modulo_transferencias',
      nombre: 'Módulo de Transferencias',
      descripcion: 'Permite a los dirigentes solicitar y gestionar transferencias de jugadores.',
      icono: '🔄',
      habilitado: true,
      cargando: false,
    },
  ];

  constructor(
    private authService: AuthService,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.loading = true;
    this.configuracionService.getAll().subscribe({
      next: (items: ConfiguracionItem[]) => {
        items.forEach((item) => {
          const modulo = this.modulos.find((m) => m.clave === item.clave);
          if (modulo) {
            modulo.habilitado = item.valor === 'true';
          }
        });
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar la configuración';
        this.loading = false;
      },
    });
  }

  toggleModulo(modulo: ModuloConfig): void {
    modulo.cargando = true;
    const nuevoValor = !modulo.habilitado;

    this.configuracionService.actualizar(modulo.clave, nuevoValor).subscribe({
      next: () => {
        modulo.habilitado = nuevoValor;
        modulo.cargando = false;
        const estado = nuevoValor ? 'habilitado' : 'deshabilitado';
        this.successMessage = `${modulo.nombre}: ${estado} correctamente`;
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: () => {
        modulo.cargando = false;
        this.errorMessage = `Error al actualizar ${modulo.nombre}`;
        setTimeout(() => (this.errorMessage = ''), 3000);
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
