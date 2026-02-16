import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RolesGuard } from './core/guards/roles.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
  },
  {
    path: 'ligas',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga'] },
    loadChildren: () =>
      import('./modules/ligas/ligas.module').then((m) => m.LigasModule),
  },
  {
    path: 'equipos',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    loadChildren: () =>
      import('./modules/equipos/equipos.module').then((m) => m.EquiposModule),
  },
  {
    path: 'jugadores',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    loadChildren: () =>
      import('./modules/jugadores/jugadores.module').then((m) => m.JugadoresModule),
  },
  {
    path: 'usuarios',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga'] },
    loadChildren: () =>
      import('./modules/usuarios/usuarios.module').then((m) => m.UsuariosModule),
  },
  {
    path: 'campeonatos',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/campeonatos/campeonatos-list/campeonatos-list.component').then(
            (m) => m.CampeonatosListComponent
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./modules/campeonatos/campeonato-form/campeonato-form.component').then(
            (m) => m.CampeonatoFormComponent
          ),
      },
      {
        path: 'editar/:id',
        loadComponent: () =>
          import('./modules/campeonatos/campeonato-form/campeonato-form.component').then(
            (m) => m.CampeonatoFormComponent
          ),
      },
    ],
  },
  {
    path: 'categorias',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/categorias/categorias-list/categorias-list.component').then(
            (m) => m.CategoriasListComponent
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./modules/categorias/categoria-form/categoria-form.component').then(
            (m) => m.CategoriaFormComponent
          ),
      },
      {
        path: 'editar/:id',
        loadComponent: () =>
          import('./modules/categorias/categoria-form/categoria-form.component').then(
            (m) => m.CategoriaFormComponent
          ),
      },
    ],
  },
  {
    path: 'inscripciones',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/inscripciones/inscripciones-list/inscripciones-list.component').then(
            (m) => m.InscripcionesListComponent
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./modules/inscripciones/inscripcion-form/inscripcion-form.component').then(
            (m) => m.InscripcionFormComponent
          ),
      },
      {
        path: 'editar/:id',
        loadComponent: () =>
          import('./modules/inscripciones/inscripcion-form/inscripcion-form.component').then(
            (m) => m.InscripcionFormComponent
          ),
      },
    ],
  },
  {
    path: 'jugador-campeonatos',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/jugador-campeonatos/jugador-campeonatos-list/jugador-campeonatos-list.component').then(
            (m) => m.JugadorCampeonatosListComponent
          ),
      },
      {
        path: 'habilitar',
        loadComponent: () =>
          import('./modules/jugador-campeonatos/jugador-campeonato-form/jugador-campeonato-form.component').then(
            (m) => m.JugadorCampeonatoFormComponent
          ),
      },
      {
        path: 'editar/:id',
        loadComponent: () =>
          import('./modules/jugador-campeonatos/jugador-campeonato-form/jugador-campeonato-form.component').then(
            (m) => m.JugadorCampeonatoFormComponent
          ),
      },
      {
        path: 'pendientes',
        loadComponent: () =>
          import('./modules/jugador-campeonatos/jugador-campeonatos-pendientes/jugador-campeonatos-pendientes.component').then(
            (m) => m.JugadorCampeonatosPendientesComponent
          ),
      },
    ],
  },
  {
    path: 'transferencias',
    canActivate: [AuthGuard, RolesGuard],
    data: { roles: ['master', 'directivo_liga', 'dirigente_equipo'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./modules/transferencias/transferencias-list/transferencias-list.component').then(
            (m) => m.TransferenciasListComponent
          ),
      },
      {
        path: 'solicitar',
        loadComponent: () =>
          import('./modules/transferencias/transferencia-form/transferencia-form.component').then(
            (m) => m.TransferenciaFormComponent
          ),
      },
      {
        path: 'pendientes-origen',
        loadComponent: () =>
          import('./modules/transferencias/transferencias-pendientes-origen/transferencias-pendientes-origen.component').then(
            (m) => m.TransferenciasPendientesOrigenComponent
          ),
      },
      {
        path: 'pendientes-directivo',
        loadComponent: () =>
          import('./modules/transferencias/transferencias-pendientes-directivo/transferencias-pendientes-directivo.component').then(
            (m) => m.TransferenciasPendientesDirectivoComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
