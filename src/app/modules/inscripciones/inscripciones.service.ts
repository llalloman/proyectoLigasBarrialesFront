import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inscripcion, CreateInscripcionDto, MovimientoCategoriaDto } from './inscripcion.model';

@Injectable({
  providedIn: 'root'
})
export class InscripcionesService {
  private apiUrl = `${environment.apiUrl}/inscripciones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(this.apiUrl);
  }

  getById(id: number): Observable<Inscripcion> {
    return this.http.get<Inscripcion>(`${this.apiUrl}/${id}`);
  }

  getByCampeonato(campeonatoId: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(`${this.apiUrl}/campeonato/${campeonatoId}`);
  }

  getByCategoria(categoriaId: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(`${this.apiUrl}/categoria/${categoriaId}`);
  }

  create(inscripcion: CreateInscripcionDto): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(this.apiUrl, inscripcion);
  }

  update(id: number, inscripcion: Partial<CreateInscripcionDto>): Observable<Inscripcion> {
    return this.http.patch<Inscripcion>(`${this.apiUrl}/${id}`, inscripcion);
  }

  confirmar(id: number, observaciones?: string): Observable<Inscripcion> {
    return this.http.patch<Inscripcion>(`${this.apiUrl}/${id}/confirmar`, { observaciones: observaciones || '' });
  }

  rechazar(id: number, observaciones: string): Observable<Inscripcion> {
    return this.http.patch<Inscripcion>(`${this.apiUrl}/${id}/rechazar`, { observaciones });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  registrarMovimientoCategoria(dto: MovimientoCategoriaDto): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(`${this.apiUrl}/movimiento-categoria`, dto);
  }

  getByEquipo(equipoId: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(`${this.apiUrl}/equipo/${equipoId}`);
  }
}
