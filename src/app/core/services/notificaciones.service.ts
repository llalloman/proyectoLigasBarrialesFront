import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  ruta: string | null;
  referenciaTipo: string | null;
  referenciaId: number | null;
  leida: boolean;
  fechaLectura: string | null;
  creadoEn: string;
}

export interface RespuestaNotificaciones {
  items: Notificacion[];
  total: number;
  noLeidas: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly apiUrl = `${environment.apiUrl}/notificaciones`;
  private readonly noLeidasSubject = new BehaviorSubject<number>(0);
  private readonly recientesSubject = new BehaviorSubject<Notificacion[]>([]);

  readonly noLeidas$ = this.noLeidasSubject.asObservable();
  readonly recientes$ = this.recientesSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  listar(filtros: {
    estado?: string;
    tipo?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<RespuestaNotificaciones> {
    let params = new HttpParams();
    if (filtros.estado && filtros.estado !== 'todas') params = params.set('estado', filtros.estado);
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.page) params = params.set('page', filtros.page);
    if (filtros.limit) params = params.set('limit', filtros.limit);
    return this.http.get<RespuestaNotificaciones>(this.apiUrl, { params }).pipe(
      tap((respuesta) => this.noLeidasSubject.next(respuesta.noLeidas)),
    );
  }

  actualizarResumen(): Observable<RespuestaNotificaciones> {
    return this.listar({ page: 1, limit: 5 }).pipe(
      tap((respuesta) => this.recientesSubject.next(respuesta.items)),
    );
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.patch<Notificacion>(`${this.apiUrl}/${id}/leida`, {}).pipe(
      tap(() => this.marcarLocalmente(id)),
    );
  }

  marcarTodasLeidas(): Observable<{ actualizadas: number }> {
    return this.http.patch<{ actualizadas: number }>(`${this.apiUrl}/marcar-todas-leidas`, {}).pipe(
      tap(() => {
        this.noLeidasSubject.next(0);
        this.recientesSubject.next(this.recientesSubject.value.map((item) => ({
          ...item,
          leida: true,
          fechaLectura: item.fechaLectura ?? new Date().toISOString(),
        })));
      }),
    );
  }

  limpiarEstado(): void {
    this.noLeidasSubject.next(0);
    this.recientesSubject.next([]);
  }

  private marcarLocalmente(id: number): void {
    const recientes = this.recientesSubject.value;
    const eraNoLeida = recientes.some((item) => item.id === id && !item.leida);
    this.recientesSubject.next(recientes.map((item) => item.id === id
      ? { ...item, leida: true, fechaLectura: item.fechaLectura ?? new Date().toISOString() }
      : item));
    if (eraNoLeida) this.noLeidasSubject.next(Math.max(0, this.noLeidasSubject.value - 1));
  }
}
