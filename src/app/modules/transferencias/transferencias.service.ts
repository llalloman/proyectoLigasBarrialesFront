import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Transferencia, CreateTransferenciaDto } from './transferencia.model';

@Injectable({
  providedIn: 'root'
})
export class TransferenciasService {
  private apiUrl = `${environment.apiUrl}/transferencias`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(this.apiUrl);
  }

  getById(id: number): Observable<Transferencia> {
    return this.http.get<Transferencia>(`${this.apiUrl}/${id}`);
  }

  getByCampeonato(campeonatoId: number): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(`${this.apiUrl}/campeonato/${campeonatoId}`);
  }

  getByJugador(jugadorId: number): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(`${this.apiUrl}/jugador/${jugadorId}`);
  }

  getPendientesEquipoOrigen(): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(`${this.apiUrl}/pendientes-equipo-origen`);
  }

  getPendientesDirectivo(): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(`${this.apiUrl}/pendientes-directivo`);
  }

  create(data: CreateTransferenciaDto): Observable<Transferencia> {
    return this.http.post<Transferencia>(this.apiUrl, data);
  }

  aprobarPorEquipoOrigen(id: number, observaciones?: string): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.apiUrl}/${id}/aprobar-equipo-origen`, { observaciones });
  }

  rechazarPorEquipoOrigen(id: number, observaciones: string): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.apiUrl}/${id}/rechazar-equipo-origen`, { observaciones });
  }

  aprobarPorDirectivo(id: number, observaciones?: string): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.apiUrl}/${id}/aprobar-directivo`, { observaciones });
  }

  rechazarPorDirectivo(id: number, observaciones: string): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.apiUrl}/${id}/rechazar-directivo`, { observaciones });
  }

  cancelar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
