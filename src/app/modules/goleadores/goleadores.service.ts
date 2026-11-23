import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FilaGoleador,
  HistorialGolFiltros,
  HistorialGolesRespuesta,
} from './goleadores.model';

@Injectable({
  providedIn: 'root',
})
export class GoleadoresService {
  private apiUrl = `${environment.apiUrl}/goles`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la tabla de goleadores por campeonato y categoría.
   * @param campeonatoId  ID del campeonato
   * @param categoriaId   ID de la categoría
   */
  getGoleadores(
    campeonatoId: number,
    categoriaId: number,
  ): Observable<FilaGoleador[]> {
    const params = new HttpParams()
      .set('campeonatoId', campeonatoId.toString())
      .set('categoriaId', categoriaId.toString());
    return this.http.get<FilaGoleador[]>(`${this.apiUrl}/goleadores`, { params });
  }

  /**
   * Obtiene los goles registrados de un partido específico.
   * Usado para pre-poblar el formulario de autores al re-abrir el modal de resultado.
   */
  getGolesPorPartido(partidoId: number): Observable<any[]> {
    const params = new HttpParams().set('partidoId', partidoId.toString());
    return this.http.get<any[]>(`${this.apiUrl}/partido`, { params });
  }

  getHistorial(filtros: HistorialGolFiltros): Observable<HistorialGolesRespuesta> {
    let params = new HttpParams()
      .set('campeonatoId', String(filtros.campeonatoId))
      .set('pagina', String(filtros.pagina ?? 1))
      .set('limite', String(filtros.limite ?? 20))
      .set('estado', filtros.estado ?? 'activos');

    const opcionales: Array<[string, string | number | null | undefined]> = [
      ['categoriaId', filtros.categoriaId],
      ['etapa', filtros.etapa],
      ['jornada', filtros.jornada],
      ['equipoId', filtros.equipoId],
      ['jugadorId', filtros.jugadorId],
      ['tipo', filtros.tipo],
      ['fechaDesde', filtros.fechaDesde],
      ['fechaHasta', filtros.fechaHasta],
    ];
    for (const [clave, valor] of opcionales) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }

    return this.http.get<HistorialGolesRespuesta>(`${this.apiUrl}/historial`, { params });
  }
}
