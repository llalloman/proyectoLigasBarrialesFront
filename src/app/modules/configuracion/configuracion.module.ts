import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionRoutingModule } from './configuracion-routing.module';
import { ConfiguracionAdminComponent } from '../../features/configuracion/configuracion-admin/configuracion-admin.component';
import { MainNavComponent } from '../../shared/components/main-nav/main-nav.component';

@NgModule({
  declarations: [ConfiguracionAdminComponent],
  imports: [
    CommonModule,
    FormsModule,
    ConfiguracionRoutingModule,
    MainNavComponent,
  ],
})
export class ConfiguracionModule {}
