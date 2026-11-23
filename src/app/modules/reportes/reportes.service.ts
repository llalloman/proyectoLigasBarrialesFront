import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReporteCampeonato,
  ReporteCampeonatoFiltros,
  ReporteEntidadFiltros,
  ReporteEquipo,
  ReporteJugador,
  ReporteJugadoresOpciones,
} from './reportes.model';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private readonly http: HttpClient) {}

  obtenerCampeonato(filtros: ReporteCampeonatoFiltros): Observable<ReporteCampeonato> {
    let params = new HttpParams().set('campeonatoId', String(filtros.campeonatoId));
    if (filtros.categoriaId) params = params.set('categoriaId', String(filtros.categoriaId));
    if (filtros.etapa?.trim()) params = params.set('etapa', filtros.etapa.trim());
    return this.http.get<ReporteCampeonato>(`${this.apiUrl}/campeonato`, { params });
  }

  obtenerEquipo(filtros: ReporteEntidadFiltros): Observable<ReporteEquipo> {
    let params = this.crearParametros(filtros);
    params = params.set('equipoId', String(filtros.equipoId));
    return this.http.get<ReporteEquipo>(`${this.apiUrl}/equipo`, { params });
  }

  obtenerJugador(filtros: ReporteEntidadFiltros): Observable<ReporteJugador> {
    let params = this.crearParametros(filtros);
    params = params.set('jugadorId', String(filtros.jugadorId));
    if (filtros.equipoId) params = params.set('equipoId', String(filtros.equipoId));
    return this.http.get<ReporteJugador>(`${this.apiUrl}/jugador`, { params });
  }

  obtenerOpcionesJugadores(filtros: ReporteEntidadFiltros): Observable<ReporteJugadoresOpciones> {
    let params = this.crearParametros(filtros);
    params = params.set('equipoId', String(filtros.equipoId));
    return this.http.get<ReporteJugadoresOpciones>(`${this.apiUrl}/opciones-jugadores`, { params });
  }

  private crearParametros(filtros: ReporteEntidadFiltros): HttpParams {
    let params = new HttpParams().set('campeonatoId', String(filtros.campeonatoId));
    if (filtros.categoriaId) params = params.set('categoriaId', String(filtros.categoriaId));
    if (filtros.etapa?.trim()) params = params.set('etapa', filtros.etapa.trim());
    return params;
  }
}
