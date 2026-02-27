import { Campeonato } from '../campeonatos/campeonato.model';
import { Categoria } from '../categorias/categoria.model';
import { Equipo } from '../../core/models/equipo.model';

export interface Inscripcion {
  id: number;
  campeonatoId: number;
  campeonato?: Campeonato;
  categoriaId: number;
  categoria?: Categoria;
  equipoId: number;
  equipo?: Equipo;
  fechaInscripcion: string;
  estado: 'pendiente' | 'confirmada' | 'rechazada';
  observaciones?: string;
  activo: boolean;
  creadoEn: string;
}

export interface CreateInscripcionDto {
  campeonatoId: number;
  categoriaId: number;
  equipoId: number;
  fechaInscripcion?: string;
  estado?: 'pendiente' | 'confirmada' | 'rechazada';
  observaciones?: string;
}
