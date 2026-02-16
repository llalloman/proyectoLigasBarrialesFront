import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Equipo } from '../models/equipo.model';

/**
 * Servicio para gestión de equipos
 * Comunica el frontend con el backend API
 */
@Injectable({
  providedIn: 'root',
})
export class EquiposService {
  private apiUrl = `${environment.apiUrl}/equipos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.apiUrl);
  }

  getByLiga(ligaId: number): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/liga/${ligaId}`);
  }

  getById(id: number): Observable<Equipo> {
    return this.http.get<Equipo>(`${this.apiUrl}/${id}`);
  }

  create(equipo: Partial<Equipo>): Observable<Equipo> {
    return this.http.post<Equipo>(this.apiUrl, equipo);
  }

  update(id: number, equipo: Partial<Equipo>): Observable<Equipo> {
    return this.http.patch<Equipo>(`${this.apiUrl}/${id}`, equipo);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  deletePermanently(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${id}/permanente`
    );
  }
}
