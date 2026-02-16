import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Jugador } from '../models/jugador.model';

/**
 * Servicio para gestión de jugadores
 * Comunica el frontend con el backend API
 */
@Injectable({
  providedIn: 'root',
})
export class JugadoresService {
  private apiUrl = `${environment.apiUrl}/jugadores`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Jugador[]> {
    return this.http.get<Jugador[]>(this.apiUrl);
  }

  getByEquipo(equipoId: number): Observable<Jugador[]> {
    return this.http.get<Jugador[]>(`${this.apiUrl}/equipo/${equipoId}`);
  }

  getLibres(): Observable<Jugador[]> {
    return this.http.get<Jugador[]>(`${this.apiUrl}/libres`);
  }

  getById(id: number): Observable<Jugador> {
    return this.http.get<Jugador>(`${this.apiUrl}/${id}`);
  }

  create(jugador: Partial<Jugador>): Observable<Jugador> {
    return this.http.post<Jugador>(this.apiUrl, jugador);
  }

  update(id: number, jugador: Partial<Jugador>): Observable<Jugador> {
    return this.http.patch<Jugador>(`${this.apiUrl}/${id}`, jugador);
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
