import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JugadorCampeonato, CreateJugadorCampeonatoDto } from './jugador-campeonato.model';

@Injectable({
  providedIn: 'root'
})
export class JugadorCampeonatosService {
  private apiUrl = `${environment.apiUrl}/jugador-campeonatos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(this.apiUrl);
  }

  getById(id: number): Observable<JugadorCampeonato> {
    return this.http.get<JugadorCampeonato>(`${this.apiUrl}/${id}`);
  }

  getByCampeonato(campeonatoId: number): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(`${this.apiUrl}/campeonato/${campeonatoId}`);
  }

  getDisponiblesParaTransferencia(campeonatoId: number): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(`${this.apiUrl}/campeonato/${campeonatoId}/disponibles-transferencia`);
  }

  getByCampeonatoAndEquipo(campeonatoId: number, equipoId: number): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(`${this.apiUrl}/campeonato/${campeonatoId}/equipo/${equipoId}`);
  }

  getByJugador(jugadorId: number): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(`${this.apiUrl}/jugador/${jugadorId}`);
  }

  getPendientes(): Observable<JugadorCampeonato[]> {
    return this.http.get<JugadorCampeonato[]>(`${this.apiUrl}/pendientes`);
  }

  create(data: CreateJugadorCampeonatoDto): Observable<JugadorCampeonato> {
    return this.http.post<JugadorCampeonato>(this.apiUrl, data);
  }

  update(id: number, data: Partial<CreateJugadorCampeonatoDto>): Observable<JugadorCampeonato> {
    return this.http.patch<JugadorCampeonato>(`${this.apiUrl}/${id}`, data);
  }

  aprobar(id: number, observaciones?: string): Observable<JugadorCampeonato> {
    return this.http.patch<JugadorCampeonato>(`${this.apiUrl}/${id}/aprobar`, { observaciones });
  }

  rechazar(id: number, observaciones: string): Observable<JugadorCampeonato> {
    return this.http.patch<JugadorCampeonato>(`${this.apiUrl}/${id}/rechazar`, { observaciones });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
