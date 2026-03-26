import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartidosService } from '../partidos.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Partido } from '../partido.model';

interface EquipoFixture {
  id: number;
  nombre: string;
  numero: number;
}

interface JornadaFixture {
  numero: number;
  partidos: { localNum: number; visitanteNum: number }[];
  descanso?: { numero: number; nombre: string };
}

@Component({
  selector: 'app-fixture-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MainNavComponent],
  templateUrl: './fixture-view.component.html',
  styleUrls: ['./fixture-view.component.scss'],
})
export class FixtureViewComponent implements OnInit {
  user$ = this.authService.currentUser$;
  loading = false;
  errorMessage = '';
  miEquipoId: number | null = null;  // ID del equipo del dirigente autenticado

  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  etapas: string[] = [];

  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;
  selectedEtapa = '';

  partidos: Partido[] = [];
  equipos: EquipoFixture[] = [];
  jornadas: JornadaFixture[] = [];

  campeonatoNombre = '';
  categoriaNombre = '';

  private queryParamCampeonatoId: number | null = null;
  private queryParamCategoriaId: number | null = null;
  private queryParamEtapa = '';

  constructor(
    private partidosService: PartidosService,
    private authService: AuthService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.queryParamCampeonatoId = params['campeonatoId'] ? +params['campeonatoId'] : null;
      this.queryParamCategoriaId = params['categoriaId'] ? +params['categoriaId'] : null;
      this.queryParamEtapa = params['etapa'] ?? '';
    });
    this.loadLigas();
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const user = this.authService.getCurrentUser();
        // Guardar equipoId si es dirigente
        if (user?.rol?.nombre === 'dirigente_equipo' && user.equipoId) {
          this.miEquipoId = user.equipoId;
        }
        if ((user?.rol?.nombre === 'directivo_liga' || user?.rol?.nombre === 'dirigente_equipo') && user.ligaId) {
          this.selectedLigaId = user.ligaId;
          this.loadCampeonatos(user.ligaId, true);
        }
      },
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.etapas = [];
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    this.clearFixture();
    if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId, false);
  }

  private loadCampeonatos(ligaId: number, autoSelect: boolean): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => {
        this.campeonatos = data;
        if (autoSelect && this.queryParamCampeonatoId) {
          const match = data.find(c => c.id === this.queryParamCampeonatoId);
          if (match) {
            this.selectedCampeonatoId = match.id;
            this.loadCategorias(match.id, true);
          }
        }
      },
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.etapas = [];
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    this.clearFixture();
    const campeonato = this.campeonatos.find(c => c.id === this.selectedCampeonatoId);
    this.campeonatoNombre = campeonato?.nombre ?? '';
    if (this.selectedCampeonatoId) this.loadCategorias(this.selectedCampeonatoId, false);
  }

  private loadCategorias(campeonatoId: number, autoSelect: boolean): void {
    const campeonato = this.campeonatos.find(c => c.id === campeonatoId);
    this.campeonatoNombre = campeonato?.nombre ?? '';
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => {
        this.categorias = data;
        if (autoSelect && this.queryParamCategoriaId) {
          const match = data.find(c => c.id === this.queryParamCategoriaId);
          if (match) {
            this.selectedCategoriaId = match.id;
            this.categoriaNombre = match.nombre;
            this.loadEtapas(true);
            return;
          }
        }
        // Si solo hay una categoría, seleccionarla automáticamente
        if (data.length === 1) {
          this.selectedCategoriaId = data[0].id;
          this.categoriaNombre = data[0].nombre;
          this.loadEtapas(false);
        }
      },
    });
  }

  onCategoriaChange(): void {
    this.etapas = [];
    this.selectedEtapa = '';
    this.clearFixture();
    const cat = this.categorias.find(c => c.id === this.selectedCategoriaId);
    this.categoriaNombre = cat?.nombre ?? '';
    if (this.selectedCategoriaId) this.loadEtapas(false);
  }

  private loadEtapas(autoSelect: boolean): void {
    if (!this.selectedCampeonatoId || !this.selectedCategoriaId) return;
    this.partidosService.getByCampeonato(this.selectedCampeonatoId, this.selectedCategoriaId).subscribe({
      next: (partidos) => {
        const set = new Set<string>(partidos.map(p => p.etapa));
        this.etapas = Array.from(set).sort();
        if (autoSelect && this.queryParamEtapa && this.etapas.includes(this.queryParamEtapa)) {
          this.selectedEtapa = this.queryParamEtapa;
          this.cargarFixture();
        } else if (this.etapas.length === 1) {
          this.selectedEtapa = this.etapas[0];
          this.cargarFixture();
        }
      },
    });
  }

  onEtapaChange(): void {
    this.cargarFixture();
  }

  cargarFixture(): void {
    if (!this.selectedCampeonatoId || !this.selectedCategoriaId || !this.selectedEtapa) {
      this.clearFixture();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.partidosService.getByCampeonato(
      this.selectedCampeonatoId,
      this.selectedCategoriaId,
      this.selectedEtapa
    ).subscribe({
      next: (partidos) => {
        this.partidos = partidos;
        this.buildFixtureTable(partidos);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar el fixture.';
        this.loading = false;
      },
    });
  }

  private buildFixtureTable(partidos: Partido[]): void {
    // Recopilar equipos únicos con nombres
    const teamMap = new Map<number, string>();
    const teamOrderMap = new Map<number, number>();
    partidos.forEach(p => {
      if (p.equipoLocalId && p.equipoLocal?.nombre) {
        teamMap.set(p.equipoLocalId, p.equipoLocal.nombre);
        if (p.equipoLocalOrden) {
          teamOrderMap.set(p.equipoLocalId, p.equipoLocalOrden);
        }
      }
      if (p.equipoVisitanteId && p.equipoVisitante?.nombre) {
        teamMap.set(p.equipoVisitanteId, p.equipoVisitante.nombre);
        if (p.equipoVisitanteOrden) {
          teamOrderMap.set(p.equipoVisitanteId, p.equipoVisitanteOrden);
        }
      }
    });

    const hasStoredOrder = teamOrderMap.size === teamMap.size && teamMap.size > 0;
    const sorted = Array.from(teamMap.entries()).sort((a, b) => {
      if (hasStoredOrder) {
        return (teamOrderMap.get(a[0]) ?? Number.MAX_SAFE_INTEGER)
          - (teamOrderMap.get(b[0]) ?? Number.MAX_SAFE_INTEGER);
      }
      return a[1].localeCompare(b[1]);
    });

    const numMap = new Map<number, number>();
    this.equipos = sorted.map(([id, nombre], i) => {
      const numero = hasStoredOrder ? (teamOrderMap.get(id) ?? i + 1) : i + 1;
      numMap.set(id, numero);
      return { id, nombre, numero };
    });

    // Agrupar por jornada
    const jornadaNums = [...new Set(partidos.map(p => p.jornada))].sort((a, b) => a - b);
    this.jornadas = jornadaNums.map(jornadaNum => {
      const jornadaPartidos = partidos.filter(p => p.jornada === jornadaNum);
      const teamsPlaying = new Set<number>();
      jornadaPartidos.forEach(p => {
        if (p.equipoLocalId) teamsPlaying.add(p.equipoLocalId);
        if (p.equipoVisitanteId) teamsPlaying.add(p.equipoVisitanteId);
      });

      // Equipo en descanso (BYE) — solo aplica si hay número impar de equipos
      const hayNumeroImpar = this.equipos.length % 2 !== 0;
      const byeTeam = hayNumeroImpar ? this.equipos.find(e => !teamsPlaying.has(e.id)) : undefined;

      return {
        numero: jornadaNum,
        partidos: jornadaPartidos.map(p => ({
          localNum: numMap.get(p.equipoLocalId!) ?? 0,
          visitanteNum: numMap.get(p.equipoVisitanteId!) ?? 0,
        })),
        descanso: byeTeam ? { numero: byeTeam.numero, nombre: byeTeam.nombre } : undefined,
      };
    });
  }

  clearFixture(): void {
    this.partidos = [];
    this.equipos = [];
    this.jornadas = [];
  }

  getNombreJornada(num: number): string {
    const nombres = [
      'PRIMERA FECHA', 'SEGUNDA FECHA', 'TERCERA FECHA', 'CUARTA FECHA',
      'QUINTA FECHA', 'SEXTA FECHA', 'SÉPTIMA FECHA', 'OCTAVA FECHA',
      'NOVENA FECHA', 'DÉCIMA FECHA', 'UNDÉCIMA FECHA', 'DUODÉCIMA FECHA',
      'DECIMOTERCERA FECHA', 'DECIMOCUARTA FECHA', 'DECIMOQUINTA FECHA',
    ];
    return nombres[num - 1] ?? `FECHA ${num}`;
  }

  imprimir(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
  }
}
