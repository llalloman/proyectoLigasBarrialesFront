import { User } from './auth.model';

/**
 * Modelo de Liga
 */
export interface Liga {
  id: number;
  nombre: string;
  ubicacion: string;
  fechaFundacion: string;
  correo?: string;
  telefono?: string;
  imagen?: string;
  directivo?: User;
  directivoId: number;
  activo: boolean;
  creadoEn: string;
}

/**
 * Request para crear una liga
 */
export interface CreateLigaRequest {
  nombre: string;
  ubicacion: string;
  fechaFundacion: string;
  directivoId: number;
}

/**
 * Request para actualizar una liga
 */
export interface UpdateLigaRequest {
  nombre?: string;
  ubicacion?: string;
  fechaFundacion?: string;
  correo?: string;
  telefono?: string;
  directivoId?: number;
  activo?: boolean;
}
