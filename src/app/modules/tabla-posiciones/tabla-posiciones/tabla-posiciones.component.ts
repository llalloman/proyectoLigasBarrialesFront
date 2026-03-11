import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TablaPosicionesService } from '../tabla-posiciones.service';
import { FilaPosicion } from '../tabla-posiciones.model';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-tabla-posiciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './tabla-posiciones.component.html',
  styleUrls: ['./tabla-posiciones.component.scss'],
})
export class TablaPosicionesComponent implements OnInit {
  // ─── Datos de la tabla ───────────────────────────────────────────────────
  tabla: FilaPosicion[] = [];
  loading = false;
  errorMessage = '';
  tablaCargada = false;

  // ─── Filtros disponibles ─────────────────────────────────────────────────
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];

  // Las etapas se cargan dinámicamente desde la BD al seleccionar campeonato+categoría
  etapasDisponibles: string[] = [];

  // ─── Selecciones actuales ─────────────────────────────────────────────────
  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;
  selectedEtapa = '';

  // Para mostrar el nombre del campeonato/categoría en el título de la tabla
  campeonatoNombre = '';
  categoriaNombre = '';
  miEquipoId: number | null = null; // ID del equipo del dirigente autenticado

  user$ = this.authService.currentUser$;

  constructor(
    private tablaPosicionesService: TablaPosicionesService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private authService: AuthService,
    private router: Router,
  ) {}

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.loadLigas();
  }

  // ─── Carga de filtros ─────────────────────────────────────────────────────

  loadLigas(): void {
    this.ligasService.getAll().subscribe({
      next: (data) => {
        this.ligas = data;
        // Si el usuario es directivo_liga o dirigente_equipo, pre-seleccionar su liga
        const user = this.authService.getCurrentUser();
        if (user?.rol?.nombre === 'dirigente_equipo' && user.equipoId) {
          this.miEquipoId = user.equipoId;
        }
        if ((user?.rol?.nombre === 'directivo_liga' || user?.rol?.nombre === 'dirigente_equipo') && user.ligaId) {
          this.selectedLigaId = user.ligaId;
          this.loadCampeonatos(user.ligaId);
        }
      },
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.etapasDisponibles = [];
    this.tabla = [];
    this.tablaCargada = false;
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId);
  }

  loadCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => (this.campeonatos = data),
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.tabla = [];
    this.etapasDisponibles = [];
    this.tablaCargada = false;
    this.selectedCategoriaId = null;
    this.selectedEtapa = '';
    if (this.selectedCampeonatoId) {
      this.loadCategorias(this.selectedCampeonatoId);
      const camp = this.campeonatos.find((c) => c.id === +this.selectedCampeonatoId!);
      this.campeonatoNombre = camp?.nombre ?? '';
    }
  }

  loadCategorias(campeonatoId: number): void {
    this.categoriasService.getByCampeonato(campeonatoId).subscribe({
      next: (data) => (this.categorias = data),
    });
  }

  onCategoriaChange(): void {
    this.tabla = [];
    this.selectedEtapa = '';
    this.etapasDisponibles = [];
    this.tablaCargada = false;
    const cat = this.categorias.find((c) => c.id === +this.selectedCategoriaId!);
    this.categoriaNombre = cat?.nombre ?? '';
    if (this.selectedCampeonatoId && this.selectedCategoriaId) {
      this.loadEtapas(this.selectedCampeonatoId, +this.selectedCategoriaId);
    }
  }

  loadEtapas(campeonatoId: number, categoriaId: number): void {
    this.tablaPosicionesService.getEtapas(campeonatoId, categoriaId).subscribe({
      next: (etapas) => (this.etapasDisponibles = etapas),
    });
  }

  // ─── Cargar tabla ─────────────────────────────────────────────────────────

  /** Se puede cargar cuando los 3 filtros están seleccionados */
  get puedeCargar(): boolean {
    return !!(this.selectedCampeonatoId && this.selectedCategoriaId && this.selectedEtapa);
  }

  cargarTabla(): void {
    if (!this.puedeCargar) return;
    this.loading = true;
    this.errorMessage = '';
    this.tabla = [];
    this.tablaCargada = true;

    this.tablaPosicionesService
      .calcular(this.selectedCampeonatoId!, this.selectedCategoriaId!, this.selectedEtapa)
      .subscribe({
        next: (data) => {
          this.tabla = data;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Error al cargar la tabla de posiciones.';
          this.loading = false;
        },
      });
  }

  // ─── Helpers de vista ─────────────────────────────────────────────────────

  /** Etiqueta legible para la etapa seleccionada */
  get etapaLabel(): string {
    return this.selectedEtapa;
  }

  /** Clase CSS para destacar las primeras posiciones */
  getPosicionClass(posicion: number): string {
    if (posicion === 1) return 'pos-1';
    if (posicion === 2) return 'pos-2';
    if (posicion === 3) return 'pos-3';
    return '';
  }

  /** Clase CSS para el valor de diferencia de goles */
  getDgClass(dg: number): string {
    if (dg > 0) return 'dg-positivo';
    if (dg < 0) return 'dg-negativo';
    return 'dg-neutro';
  }
}
