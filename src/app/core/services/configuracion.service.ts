import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConfiguracionItem {
  id: number;
  clave: string;
  valor: string;
  descripcion: string;
  updatedAt: string;
}

/**
 * Servicio para gestionar la configuración global del sistema
 * Cachea los valores localmente para acceso síncrono en plantillas
 */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  private readonly apiUrl = `${environment.apiUrl}/configuracion`;
  private loaded = false;
  private cache = new BehaviorSubject<Map<string, boolean>>(new Map());

  constructor(private http: HttpClient) {}

  /**
   * Carga la configuración desde el backend y la almacena en caché
   */
  cargar(): Observable<void> {
    return this.http.get<ConfiguracionItem[]>(this.apiUrl).pipe(
      tap((items) => {
        const map = new Map<string, boolean>();
        items.forEach((item) => map.set(item.clave, item.valor === 'true'));
        this.cache.next(map);
        this.loaded = true;
      }),
      map(() => undefined),
      catchError(() => {
        // Fail-open: si no se puede cargar, se asume todo habilitado
        this.loaded = true;
        return of(undefined);
      })
    );
  }

  /** Devuelve si ya se cargó la configuración */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Verifica si un módulo está habilitado (síncrono, usa caché)
   * Por defecto devuelve true si no se ha cargado aún (fail-open)
   */
  isHabilitado(clave: string): boolean {
    const val = this.cache.value.get(clave);
    return val !== false;
  }

  /** Obtiene todos los items de configuración desde el backend */
  getAll(): Observable<ConfiguracionItem[]> {
    return this.http.get<ConfiguracionItem[]>(this.apiUrl);
  }

  /**
   * Actualiza el valor de una configuración y actualiza el caché local
   */
  actualizar(clave: string, habilitado: boolean): Observable<ConfiguracionItem> {
    return this.http
      .patch<ConfiguracionItem>(`${this.apiUrl}/${clave}`, {
        valor: habilitado ? 'true' : 'false',
      })
      .pipe(
        tap((updated) => {
          const map = new Map(this.cache.value);
          map.set(updated.clave, updated.valor === 'true');
          this.cache.next(map);
        })
      );
  }

  /** Limpia el caché (llamar al hacer logout) */
  reset(): void {
    this.loaded = false;
    this.cache.next(new Map());
  }
}
