import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InscripcionesService } from '../inscripciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Inscripcion } from '../inscripcion.model';

interface GrupoCampeonato {
  campeonatoId: number;
  campeonatoNombre: string;
  ligaNombre: string;
  inscripciones: Inscripcion[];
}

@Component({
  selector: 'app-historial-equipo',
  standalone: true,
  imports: [CommonModule, RouterModule, MainNavComponent],
  templateUrl: './historial-equipo.component.html',
  styleUrls: ['./historial-equipo.component.scss'],
})
export class HistorialEquipoComponent implements OnInit {
  loading = false;
  errorMessage = '';

  equipoId: number | null = null;
  equipoNombre = '';

  historial: Inscripcion[] = [];
  grupos: GrupoCampeonato[] = [];

  // Estadísticas rápidas
  totalParticipaciones = 0;
  totalAscensos = 0;
  totalDescensos = 0;
  totalConfirmadas = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inscripcionesService: InscripcionesService,
    private authService: AuthService,
    public permissions: PermissionsService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    const paramId = this.route.snapshot.paramMap.get('equipoId');
    if (paramId) {
      this.equipoId = Number(paramId);
    } else if (user?.equipoId) {
      // dirigente_equipo sin parámetro → usa su propio equipo
      this.equipoId = user.equipoId;
    } else {
      this.router.navigate(['/inscripciones']);
      return;
    }

    this.cargarHistorial();
  }

  cargarHistorial(): void {
    if (!this.equipoId) return;

    this.loading = true;
    this.errorMessage = '';

    this.inscripcionesService.getByEquipo(this.equipoId).subscribe({
      next: (data) => {
        this.historial = data;
        this.procesarHistorial();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al cargar el historial.';
        this.loading = false;
      },
    });
  }

  private procesarHistorial(): void {
    if (this.historial.length === 0) {
      this.equipoNombre = '';
      this.grupos = [];
      return;
    }

    // Nombre del equipo desde la primera inscripción
    this.equipoNombre = this.historial[0].equipo?.nombre || `Equipo #${this.equipoId}`;

    // Estadísticas
    this.totalParticipaciones = this.historial.length;
    this.totalAscensos = this.historial.filter((i) => i.motivo === 'ascenso').length;
    this.totalDescensos = this.historial.filter((i) => i.motivo === 'descenso').length;
    this.totalConfirmadas = this.historial.filter((i) => i.estado === 'confirmada').length;

    // Agrupar por campeonato
    const mapa = new Map<number, GrupoCampeonato>();
    for (const insc of this.historial) {
      const cId = insc.campeonatoId;
      if (!mapa.has(cId)) {
        mapa.set(cId, {
          campeonatoId: cId,
          campeonatoNombre: insc.campeonato?.nombre || `Campeonato #${cId}`,
          ligaNombre: (insc.campeonato as any)?.liga?.nombre || '',
          inscripciones: [],
        });
      }
      mapa.get(cId)!.inscripciones.push(insc);
    }
    this.grupos = Array.from(mapa.values());
  }

  getEstadoText(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      rechazada: 'Rechazada',
      transferida: 'Transferida',
    };
    return map[estado] || estado;
  }

  getMotivoIcon(motivo: string | null | undefined): string {
    if (motivo === 'ascenso') return '⬆️';
    if (motivo === 'descenso') return '⬇️';
    return '';
  }

  getMotivoText(motivo: string | null | undefined): string {
    if (motivo === 'ascenso') return 'Ascenso';
    if (motivo === 'descenso') return 'Descenso';
    return '';
  }

  volver(): void {
    this.router.navigate(['/inscripciones']);
  }
}
