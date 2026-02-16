import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Liga, CreateLigaRequest, UpdateLigaRequest } from '../models/liga.model';

/**
 * Servicio de Ligas
 * Aplica principios SOLID:
 * - Single Responsibility: Solo maneja lógica de ligas
 * - Dependency Inversion: Depende de HttpClient (abstracción)
 */
@Injectable({
  providedIn: 'root',
})
export class LigasService {
  private readonly apiUrl = `${environment.apiUrl}/ligas`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las ligas
   */
  getAll(): Observable<Liga[]> {
    return this.http.get<Liga[]>(this.apiUrl);
  }

  /**
   * Obtiene todas las ligas activas
   */
  getActive(): Observable<Liga[]> {
    return this.http.get<Liga[]>(`${this.apiUrl}/activas`);
  }

  /**
   * Obtiene una liga por ID
   */
  getById(id: number): Observable<Liga> {
    return this.http.get<Liga>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea una nueva liga
   */
  create(liga: CreateLigaRequest): Observable<Liga> {
    return this.http.post<Liga>(this.apiUrl, liga);
  }

  /**
   * Actualiza una liga existente
   */
  update(id: number, liga: UpdateLigaRequest): Observable<Liga> {
    return this.http.patch<Liga>(`${this.apiUrl}/${id}`, liga);
  }

  /**
   * Desactiva una liga
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Elimina permanentemente una liga
   */
  deletePermanently(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/permanente`);
  }
}
