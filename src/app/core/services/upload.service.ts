import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  message: string;
  url: string;
  filename: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Sube un archivo de imagen al servidor
   * @param file Archivo a subir
   * @param tipo Tipo de entidad: 'liga', 'equipo', 'jugador', 'cedula'
   * @param ligaId ID de la liga (opcional para jugadores sin liga)
   * @returns Observable con la respuesta del servidor
   */
  uploadImage(
    file: File, 
    tipo: 'liga' | 'equipo' | 'jugador' | 'cedula', 
    ligaId?: number
  ): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    if (ligaId) {
      formData.append('ligaId', ligaId.toString());
    }

    return this.http.post<UploadResponse>(this.apiUrl, formData);
  }

  /**
   * Sube un archivo con reporte de progreso
   * @param file Archivo a subir
   * @param tipo Tipo de entidad
   * @param ligaId ID de la liga (opcional)
   * @returns Observable con eventos de progreso
   */
  uploadImageWithProgress(
    file: File,
    tipo: 'liga' | 'equipo' | 'jugador' | 'cedula',
    ligaId?: number
  ): Observable<HttpEvent<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    if (ligaId) {
      formData.append('ligaId', ligaId.toString());
    }

    return this.http.post<UploadResponse>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Obtiene la URL completa de una imagen
   * @param relativePath Ruta relativa de la imagen (ej: /uploads/liga-1/logo.jpg)
   * @returns URL completa
   */
  getFullImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    
    // Si ya es una URL completa (empieza con http), devolverla tal cual
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Si es una ruta relativa, agregar el host del backend
    return `${environment.apiUrl.replace('/api', '')}${relativePath}`;
  }
}
