import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './modules/auth/login/login.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app-routing.module';

/**
 * Módulo raíz de la aplicación
 * Aplica el principio de modularidad
 */
@NgModule({
  declarations: [AppComponent, LoginComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
  ],
  providers: [
    provideRouter(routes, withHashLocation()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    
  ],
  
  bootstrap: [AppComponent],
})
export class AppModule {}
