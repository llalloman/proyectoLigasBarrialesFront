import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GoleadoresService } from '../goleadores.service';
import { FilaGoleador } from '../goleadores.model';
import { LigasService } from '../../../core/services/ligas.service';
import { CampeonatosService } from '../../campeonatos/campeonatos.service';
import { CategoriasService } from '../../categorias/categorias.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainNavComponent } from '../../../shared/components/main-nav/main-nav.component';

@Component({
  selector: 'app-goleadores-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainNavComponent],
  templateUrl: './goleadores-list.component.html',
  styleUrls: ['./goleadores-list.component.scss'],
})
export class GoleadoresListComponent implements OnInit {
  // ─── Datos ────────────────────────────────────────────────────────────────
  goleadores: FilaGoleador[] = [];
  loading = false;
  errorMessage = '';
  tablaCargada = false;

  // ─── Filtros disponibles ──────────────────────────────────────────────────
  ligas: any[] = [];
  campeonatos: any[] = [];
  categorias: any[] = [];

  // ─── Selecciones actuales ─────────────────────────────────────────────────
  selectedLigaId: number | null = null;
  selectedCampeonatoId: number | null = null;
  selectedCategoriaId: number | null = null;

  // Para mostrar en el título
  campeonatoNombre = '';
  categoriaNombre = '';

  user$ = this.authService.currentUser$;

  constructor(
    private goleadoresService: GoleadoresService,
    private ligasService: LigasService,
    private campeonatosService: CampeonatosService,
    private categoriasService: CategoriasService,
    private authService: AuthService,
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
        const user = this.authService.getCurrentUser();
        if (
          (user?.rol?.nombre === 'directivo_liga' ||
            user?.rol?.nombre === 'dirigente_equipo') &&
          user.ligaId
        ) {
          this.selectedLigaId = user.ligaId;
          this.loadCampeonatos(user.ligaId);
        }
      },
    });
  }

  onLigaChange(): void {
    this.campeonatos = [];
    this.categorias = [];
    this.goleadores = [];
    this.tablaCargada = false;
    this.selectedCampeonatoId = null;
    this.selectedCategoriaId = null;
    if (this.selectedLigaId) this.loadCampeonatos(this.selectedLigaId);
  }

  loadCampeonatos(ligaId: number): void {
    this.campeonatosService.getByLiga(ligaId).subscribe({
      next: (data) => (this.campeonatos = data),
    });
  }

  onCampeonatoChange(): void {
    this.categorias = [];
    this.goleadores = [];
    this.tablaCargada = false;
    this.selectedCategoriaId = null;
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
    this.goleadores = [];
    this.tablaCargada = false;
    const cat = this.categorias.find((c) => c.id === +this.selectedCategoriaId!);
    this.categoriaNombre = cat?.nombre ?? '';
  }

  // ─── Cargar goleadores ────────────────────────────────────────────────────

  get puedeCargar(): boolean {
    return !!(this.selectedCampeonatoId && this.selectedCategoriaId);
  }

  cargarGoleadores(): void {
    if (!this.puedeCargar) return;
    this.loading = true;
    this.errorMessage = '';
    this.goleadores = [];
    this.tablaCargada = true;

    this.goleadoresService
      .getGoleadores(this.selectedCampeonatoId!, this.selectedCategoriaId!)
      .subscribe({
        next: (data) => {
          this.goleadores = data;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Error al cargar la tabla de goleadores.';
          this.loading = false;
        },
      });
  }

  // ─── Helpers de vista ─────────────────────────────────────────────────────

  getPosicionClass(posicion: number): string {
    if (posicion === 1) return 'pos-1';
    if (posicion === 2) return 'pos-2';
    if (posicion === 3) return 'pos-3';
    return '';
  }

  getPosicionEmoji(posicion: number): string {
    if (posicion === 1) return '🥇';
    if (posicion === 2) return '🥈';
    if (posicion === 3) return '🥉';
    return `${posicion}`;
  }
}
