import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracionAdminComponent } from '../../features/configuracion/configuracion-admin/configuracion-admin.component';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionAdminComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfiguracionRoutingModule {}
