import { Equipo } from './equipo.model';

export interface Jugador {
  id: number;
  nombre: string;
  nombreCompleto?: string; // Campo virtual del backend
  fechaNacimiento?: Date;
  cedula?: string;
  equipoId?: number;
  equipo?: Equipo;
  descripcion?: string;
  imagen?: string;
  fotoPerfil?: string; // Campo virtual del backend (alias de imagen)
  imagenCedula?: string;
  numeroCancha?: number;
  posicion?: string;
  activo: boolean;
  creadoEn: Date;
}
