import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActaIncidencia,
  ActaInformePartido,
  AlineacionResponse,
  GuardarAlineacionDto,
  GuardarInformePartidoDto,
  InformePartidoResponse,
  JugadoresDisponiblesResponse,
  ResolverIncidenciaDto,
} from './acta-partido.model';

@Injectable({ providedIn: 'root' })
export class ActaPartidoService {
  private readonly base = `${environment.apiUrl}/acta-partido`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los jugadores habilitados de ambos equipos con el estado sugerido.
   * Si un jugador tiene sanción activa, su estadoSugerido vendrá como 'suspendido'.
   */
  obtenerJugadoresDisponibles(partidoId: number): Observable<JugadoresDisponiblesResponse> {
    return this.http.get<JugadoresDisponiblesResponse>(
      `${this.base}/${partidoId}/jugadores-disponibles`,
    );
  }

  /**
   * Obtiene la alineación ya guardada de un partido.
   */
  obtenerAlineacion(partidoId: number): Observable<AlineacionResponse> {
    return this.http.get<AlineacionResponse>(`${this.base}/${partidoId}`);
  }

  /**
   * Guarda (o reemplaza) la alineación completa de un partido.
   */
  guardarAlineacion(
    partidoId: number,
    dto: GuardarAlineacionDto,
  ): Observable<AlineacionResponse> {
    return this.http.put<AlineacionResponse>(
      `${this.base}/${partidoId}/alineacion`,
      dto,
    );
  }

  // ── Informe del Vocal ────────────────────────────────────────────────────

  /**
   * Obtiene el informe del vocal del partido más sus incidencias.
   * Si el vocal aún no llenó el informe, informe vendrá como null.
   */
  obtenerInforme(partidoId: number): Observable<InformePartidoResponse> {
    return this.http.get<InformePartidoResponse>(`${this.base}/${partidoId}/informe`);
  }

  /**
   * El vocal guarda / actualiza el informe y la lista de incidencias.
   * Solo reemplaza incidencias 'pendiente' — las ya resueltas por el tribunal no se tocan.
   * Si dto.enviarATribunal=true, el estado pasa a 'enviado_tribunal'.
   */
  guardarInforme(
    partidoId: number,
    dto: GuardarInformePartidoDto,
  ): Observable<{ informe: ActaInformePartido; incidencias: ActaIncidencia[] }> {
    return this.http.put<{ informe: ActaInformePartido; incidencias: ActaIncidencia[] }>(
      `${this.base}/${partidoId}/informe`,
      dto,
    );
  }

  // ── Tribunal de Penas ────────────────────────────────────────────────────

  /**
   * Lista todas las incidencias disciplinarias pendientes de un campeonato.
   * Es la vista principal del Tribunal de Penas.
   */
  listarIncidenciasPendientes(campeonatoId: number): Observable<ActaIncidencia[]> {
    return this.http.get<ActaIncidencia[]>(
      `${this.base}/campeonato/${campeonatoId}/incidencias`,
    );
  }

  /**
   * El Tribunal de Penas resuelve una incidencia.
   * si decision='sancionar' → el backend crea una Sancion automáticamente.
   * si decision='absolver'  → la incidencia se cierra sin crear sanción.
   */
  resolverIncidencia(
    incidenciaId: number,
    dto: ResolverIncidenciaDto,
  ): Observable<ActaIncidencia> {
    return this.http.put<ActaIncidencia>(
      `${this.base}/incidencias/${incidenciaId}/resolver`,
      dto,
    );
  }
}
