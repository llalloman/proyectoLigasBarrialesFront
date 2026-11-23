import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { JugadoresRoutingModule } from './jugadores-routing.module';
import { JugadoresListComponent } from './jugadores-list/jugadores-list.component';
import { JugadorFormComponent } from './jugador-form/jugador-form.component';
import { JugadorDetailComponent } from './jugador-detail/jugador-detail.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { MainNavComponent } from '../../shared/components/main-nav/main-nav.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

@NgModule({
  declarations: [
    JugadoresListComponent,
    JugadorFormComponent,
    JugadorDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    JugadoresRoutingModule,
    ImageUploadComponent,
    MainNavComponent,
    SearchableSelectComponent,
  ]
})
export class JugadoresModule { }
