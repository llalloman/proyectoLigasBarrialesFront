import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TipoSancion,
  ReglaSancion,
  Sancion,
  CreateTipoSancionDto,
  CreateReglaSancionDto,
  UpdateReglaSancionDto,
  CreateSancionDto,
  FiltrosSanciones,
} from './sancion.model';

@Injectable({
  providedIn: 'root',
})
export class SancionesService {
  private readonly apiUrl = `${environment.apiUrl}/sanciones`;

  constructor(private http: HttpClient) {}

  // ─── Tipos de sanción ─────────────────────────────────────────────────────

  getTiposSancion(ligaId?: number): Observable<TipoSancion[]> {
    let params = new HttpParams();
    if (ligaId) params = params.set('ligaId', ligaId.toString());
    return this.http.get<TipoSancion[]>(`${this.apiUrl}/tipos`, { params });
  }

  createTipoSancion(dto: CreateTipoSancionDto): Observable<TipoSancion> {
    return this.http.post<TipoSancion>(`${this.apiUrl}/tipos`, dto);
  }

  updateTipoSancion(id: number, dto: Partial<CreateTipoSancionDto> & { activo?: boolean }): Observable<TipoSancion> {
    return this.http.patch<TipoSancion>(`${this.apiUrl}/tipos/${id}`, dto);
  }

  deleteTipoSancion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/tipos/${id}`);
  }

  // ─── Reglas de sanción ────────────────────────────────────────────────────

  getReglas(ligaId: number, campeonatoId?: number): Observable<ReglaSancion[]> {
    let params = new HttpParams().set('ligaId', ligaId.toString());
    if (campeonatoId) params = params.set('campeonatoId', campeonatoId.toString());
    return this.http.get<ReglaSancion[]>(`${this.apiUrl}/reglas`, { params });
  }

  createRegla(dto: CreateReglaSancionDto): Observable<ReglaSancion> {
    return this.http.post<ReglaSancion>(`${this.apiUrl}/reglas`, dto);
  }

  updateRegla(id: number, dto: UpdateReglaSancionDto): Observable<ReglaSancion> {
    return this.http.patch<ReglaSancion>(`${this.apiUrl}/reglas/${id}`, dto);
  }

  // ─── Sanciones ────────────────────────────────────────────────────────────

  getSanciones(filtros: FiltrosSanciones): Observable<Sancion[]> {
    let params = new HttpParams();
    if (filtros.campeonatoId) params = params.set('campeonatoId', filtros.campeonatoId.toString());
    if (filtros.ligaId) params = params.set('ligaId', filtros.ligaId.toString());
    if (filtros.jugadorId) params = params.set('jugadorId', filtros.jugadorId.toString());
    if (filtros.equipoId) params = params.set('equipoId', filtros.equipoId.toString());
    if (filtros.tipoSancionId) params = params.set('tipoSancionId', filtros.tipoSancionId.toString());
    if (filtros.soloActivas) params = params.set('soloActivas', 'true');
    return this.http.get<Sancion[]>(this.apiUrl, { params });
  }

  getSancionesActivasJugador(jugadorId: number): Observable<Sancion[]> {
    return this.http.get<Sancion[]>(`${this.apiUrl}/jugador/${jugadorId}/activas`);
  }

  createSancion(dto: CreateSancionDto): Observable<Sancion> {
    return this.http.post<Sancion>(this.apiUrl, dto);
  }

  updateSancion(id: number, dto: Partial<CreateSancionDto> & { partidosCumplidos?: number; suspensionActiva?: boolean }): Observable<Sancion> {
    return this.http.patch<Sancion>(`${this.apiUrl}/${id}`, dto);
  }

  deleteSancion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // ─── Arrastre entre campeonatos ───────────────────────────────────────────

  /**
   * Obtiene suspensiones activas del jugador en campeonatos anteriores
   * de la misma liga (llama al endpoint de sanciones).
   */
  getSuspensionesArrastradas(
    jugadorId: number,
    ligaId: number,
    campeonatoId: number,
  ): Observable<Sancion[]> {
    const params = new HttpParams()
      .set('ligaId', ligaId.toString())
      .set('campeonatoId', campeonatoId.toString());
    return this.http.get<Sancion[]>(`${this.apiUrl}/jugador/${jugadorId}/arrastradas`, { params });
  }

  /**
   * Transfiere la sanción al nuevo campeonato y cierra la original.
   */
  transferirSancion(sancionId: number, nuevoCampeonatoId: number): Observable<Sancion> {
    return this.http.post<Sancion>(
      `${this.apiUrl}/${sancionId}/transferir/${nuevoCampeonatoId}`,
      {},
    );
  }
}
