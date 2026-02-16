import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: {
    id: number;
    nombre: string;
  };
  ligaId?: number;
  equipoId?: number;
  activo: boolean;
  creadoEn: Date;
}

export interface CreateUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rolId: number;
  ligaId?: number;
  equipoId?: number;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  email?: string;
  rolId?: number;
  ligaId?: number;
  equipoId?: number;
  activo?: boolean;
}

export interface ChangePasswordDto {
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los usuarios
   */
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /**
   * Obtiene un usuario por ID
   */
  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  createUsuario(usuario: CreateUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  /**
   * Actualiza un usuario
   */
  updateUsuario(id: number, usuario: UpdateUsuarioDto): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}`, usuario);
  }

  /**
   * Cambia la contraseña de un usuario
   */
  changePassword(id: number, data: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/change-password`, data);
  }

  /**
   * Activa un usuario
   */
  activateUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}/activate`, {});
  }

  /**
   * Desactiva un usuario
   */
  deactivateUsuario(id: number): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  /**
   * Elimina (desactiva) un usuario
   */
  deleteUsuario(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
