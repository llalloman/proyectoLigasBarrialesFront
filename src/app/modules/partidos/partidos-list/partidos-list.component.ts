import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PartidosService } from '../partidos.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AuthService } from '../../../core/services/auth.service';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';
import { Partido, RegistrarResultadoDto } from '../partido.model';

@Component({
  selector: 'app-partidos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MainNavComponent],
  templateUrl: './partidos-list.component.html',
  styleUrls: ['./partidos-list.component.scss'],
})
export class PartidosListComponent implements OnInit {
  partidos: Partido[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  user$ = this.authService.currentUser$;

  // Filtros
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];
  etapas: string[] = [];
  jornadas: number[] = [];

  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;
  selectedEtapa = '';
  selectedJornada: number | null = null;

  // Modal resultado
  resultadoModal: { visible: boolean; partido: Partido | null } = { visible: false, partido: null };
  resultadoForm: RegistrarResultadoDto = { golesLocal: 0, golesVisitante: 0, sancionado: 'ninguno' };
  savingResultado = false;

  constructor(
    private partidosService: PartidosService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    public permissions: PermissionsService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLigas();
    // Leer campeonatoId de queryParams si viene desde generar-fixture
    this.route.queryParams.subscribe((params) => {
      if (params['campeonatoId']) {
        this.selectedCampeonatoId = +params['campeonatoId'];
        this.loadCategorias(this.selectedCampeonatoId!);
        this.cargarPartidos();
      }
    });
  }

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        const user = this.authService.getCurrentUser();
        if ((user?.rol?.nombre === 'directivo_liga' || user?.rol?.nombre === 'dirigente_equipo') && user.ligaId) {
          this.selectedLigaId = user.ligaId;
          this.loadCampeonatos(user.ligaId);
        }
      },
    });
  }

  loadCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => (this.campeonatos = data),
    });
  }

  loadCategorias(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => (this.categorias = data),
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.partidos = [];
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId);
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.selectedCategoriaId = null;
    this.partidos = [];
    if (this.selectedCampeonatoId) {
      this.loadCategorias(this.selectedCampeonatoId);
      this.cargarPartidos();
    }
  }

  onFiltroChange(): void {
    this.cargarPartidos();
  }

  cargarPartidos(): void {
    if (!this.selectedCampeonatoId) return;
    this.loading = true;
    this.errorMessage = '';

    this.partidosService
      .getByCampeonato(
        this.selectedCampeonatoId,
        this.selectedCategoriaId ?? undefined,
        this.selectedEtapa || undefined
      )
      .subscribe({
        next: (data) => {
          this.partidos = data;
          this.calcularEtapasYJornadas();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al cargar los partidos';
          this.loading = false;
        },
      });
  }

  calcularEtapasYJornadas(): void {
    this.etapas = [...new Set(this.partidos.map((p) => p.etapa))].sort();
    const filtrados = this.selectedEtapa
      ? this.partidos.filter((p) => p.etapa === this.selectedEtapa)
      : this.partidos;
    this.jornadas = [...new Set(filtrados.map((p) => p.jornada))].sort((a, b) => a - b);
  }

  get partidosFiltrados(): Partido[] {
    return this.partidos.filter((p) => {
      if (this.selectedEtapa && p.etapa !== this.selectedEtapa) return false;
      if (this.selectedJornada && p.jornada !== this.selectedJornada) return false;
      return true;
    });
  }

  get partidosPorJornada(): Map<number, Partido[]> {
    const mapa = new Map<number, Partido[]>();
    this.partidosFiltrados.forEach((p) => {
      const list = mapa.get(p.jornada) ?? [];
      list.push(p);
      mapa.set(p.jornada, list);
    });
    return mapa;
  }

  get jornadasOrdenadas(): number[] {
    return [...this.partidosPorJornada.keys()].sort((a, b) => a - b);
  }

  // ===== Resultado =====
  abrirModalResultado(partido: Partido): void {
    this.resultadoModal = { visible: true, partido };
    this.resultadoForm = {
      golesLocal: partido.golesLocal ?? 0,
      golesVisitante: partido.golesVisitante ?? 0,
      bonificacionLocal: partido.bonificacionLocal ?? 0,
      bonificacionVisitante: partido.bonificacionVisitante ?? 0,
      observaciones: partido.observaciones ?? '',
      sancionado: partido.sancionado ?? 'ninguno',
    };
  }

  cerrarModalResultado(): void {
    this.resultadoModal = { visible: false, partido: null };
  }

  guardarResultado(): void {
    if (!this.resultadoModal.partido) return;
    this.savingResultado = true;
    this.partidosService
      .registrarResultado(this.resultadoModal.partido.id, this.resultadoForm)
      .subscribe({
        next: (partidoActualizado) => {
          const idx = this.partidos.findIndex((p) => p.id === partidoActualizado.id);
          if (idx !== -1) this.partidos[idx] = partidoActualizado;
          this.successMessage = 'Resultado registrado correctamente.';
          this.cerrarModalResultado();
          this.savingResultado = false;
          setTimeout(() => (this.successMessage = ''), 4000);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al registrar resultado';
          this.savingResultado = false;
        },
      });
  }

  // ===== Eliminar fixture =====
  eliminarFixture(): void {
    if (!this.selectedCampeonatoId || !this.selectedCategoriaId || !this.selectedEtapa) {
      this.errorMessage = 'Selecciona campeonato, categoría y etapa para eliminar el fixture.';
      return;
    }
    if (!confirm(`¿Eliminar todos los partidos de la etapa "${this.selectedEtapa}"? Esta acción no se puede deshacer.`)) return;

    this.partidosService
      .eliminarFixture(this.selectedCampeonatoId, this.selectedCategoriaId, this.selectedEtapa)
      .subscribe({
        next: (res) => {
          this.successMessage = `Se eliminaron ${res.eliminados} partidos.`;
          this.cargarPartidos();
        },
        error: (err) => (this.errorMessage = err?.error?.message || 'Error al eliminar el fixture'),
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      programado: 'bg-secondary',
      jugado: 'bg-success',
      suspendido: 'bg-warning text-dark',
      cancelado: 'bg-danger',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  logout(): void {
    this.authService.logout();
  }
}
